import { beforeEach, describe, expect, it } from 'vitest';
import { bucket, db, makeFixture, type Fixture } from '../test/factories';
import { buildMediaKey, mediaPrefix, ownsMediaKey, parseMediaKey, serveMedia } from './media';

const USER = '3d279fbe-7e50-40c8-ad5b-049e996258d8';
const MANIFESTATION = '1aa20484-0212-4c45-91b9-a6566a14ff85';
const FILE = '35a59070-63be-401a-973b-3bc80231807e';

describe('media keys', () => {
  it('builds users/{userId}/{manifestationId}/{uuid}.jpg', () => {
    expect(buildMediaKey(USER, MANIFESTATION, FILE)).toBe(
      `users/${USER}/${MANIFESTATION}/${FILE}.jpg`,
    );
    expect(mediaPrefix(USER)).toBe(`users/${USER}/`);
  });

  it('refuses to build a key from anything that is not a uuid', () => {
    expect(() => buildMediaKey('../../etc', MANIFESTATION, FILE)).toThrow();
    expect(() => buildMediaKey(USER, MANIFESTATION, 'profile')).toThrow();
  });

  it('rejects traversal, prefixes and other shapes', () => {
    const bad = [
      `users/${USER}/${MANIFESTATION}/../../${USER}/x.jpg`,
      `users/${USER}/`,
      `users/${USER}/${MANIFESTATION}/${FILE}.png`,
      `users/${USER}/${MANIFESTATION}/${FILE}.jpg/../other.jpg`,
      `/users/${USER}/${MANIFESTATION}/${FILE}.jpg`,
      `USERS/${USER}/${MANIFESTATION}/${FILE}.jpg`,
      '',
    ];
    for (const key of bad) {
      expect(parseMediaKey(key), key).toBeNull();
      expect(ownsMediaKey(USER, key), key).toBe(false);
    }
  });

  it('parses a good key', () => {
    expect(parseMediaKey(`users/${USER}/${MANIFESTATION}/${FILE}.jpg`)).toEqual({
      userId: USER,
      manifestationId: MANIFESTATION,
      fileId: FILE,
    });
  });
});

describe('GET /media/[...key]', () => {
  let alice: Fixture;

  beforeEach(async () => {
    alice = await makeFixture('alice');
  });

  it('404s a key that is well-formed but has no object', async () => {
    const missing = buildMediaKey(alice.user.id, alice.manifestation.id, FILE);
    const response = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: alice.token,
      key: missing,
    });
    expect(response.status).toBe(404);
  });

  it('404s a malformed key rather than reaching R2', async () => {
    const response = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: alice.token,
      key: '../../../secrets',
    });
    expect(response.status).toBe(404);
  });

  it('answers 304 when the browser already has the photo', async () => {
    const first = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: alice.token,
      key: alice.photoKey,
    });
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const second = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: alice.token,
      key: alice.photoKey,
      ifNoneMatch: etag,
    });
    expect(second.status).toBe(304);
  });

  it('never allows a shared or public cache to keep the photo', async () => {
    const response = await serveMedia({
      db: db(),
      bucket: bucket(),
      sessionToken: alice.token,
      key: alice.photoKey,
    });
    expect(response.headers.get('Cache-Control')).toContain('private');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});

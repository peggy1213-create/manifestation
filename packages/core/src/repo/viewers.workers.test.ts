import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDb,
  createDraft,
  createGuestSession,
  createSessionForUser,
  deleteExpiredSessions,
  deleteSession,
  findViewerBySession,
  getManifestation,
  touchSession,
  type Db,
} from './index';

const NOW = 1_764_000_000_000;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

let db: Db;

beforeEach(async () => {
  db = createDb(env.DB);
  await env.DB.exec('DELETE FROM manifestations');
  await env.DB.exec('DELETE FROM sessions');
  await env.DB.exec('DELETE FROM users');
});

describe('createGuestSession', () => {
  it('gives a guest a real user row, so their 顯化 survives signing in later', async () => {
    const viewer = await createGuestSession(db, {
      tokenHash: 'hash-a',
      userId: 'user-a',
      now: NOW,
      ttlMs: TTL_MS,
    });

    expect(viewer).toEqual({ userId: 'user-a', isGuest: true });
    await expect(findViewerBySession(db, 'hash-a', NOW + 1_000)).resolves.toEqual(viewer);
  });

  it('stores only the hash of the token', async () => {
    await createGuestSession(db, { tokenHash: 'hash-a', now: NOW, ttlMs: TTL_MS });

    const { results } = await env.DB.prepare('select * from sessions').all();
    expect(Object.keys(results[0] ?? {})).toEqual([
      'token_hash',
      'user_id',
      'created_at',
      'expires_at',
    ]);
    expect(results[0]).toMatchObject({ token_hash: 'hash-a' });
  });
});

describe('findViewerBySession', () => {
  it('ignores an expired session', async () => {
    await createGuestSession(db, {
      tokenHash: 'hash-a',
      userId: 'user-a',
      now: NOW,
      ttlMs: TTL_MS,
    });

    await expect(findViewerBySession(db, 'hash-a', NOW + TTL_MS + 1)).resolves.toBeNull();
  });

  it('ignores an unknown token', async () => {
    await expect(findViewerBySession(db, 'nope', NOW)).resolves.toBeNull();
  });

  it('reports a member as not a guest', async () => {
    await env.DB.prepare(
      'insert into users (id, is_guest, email, name, created_at) values (?, 0, ?, ?, ?)',
    )
      .bind('user-m', 'a@example.com', 'A', NOW)
      .run();
    await createSessionForUser(db, 'user-m', { tokenHash: 'hash-m', now: NOW, ttlMs: TTL_MS });

    await expect(findViewerBySession(db, 'hash-m', NOW + 1)).resolves.toEqual({
      userId: 'user-m',
      isGuest: false,
    });
  });
});

describe('touchSession', () => {
  it('rolls the expiry forward', async () => {
    await createGuestSession(db, {
      tokenHash: 'hash-a',
      userId: 'user-a',
      now: NOW,
      ttlMs: TTL_MS,
    });
    const later = NOW + TTL_MS - 1_000;
    await touchSession(db, 'hash-a', { now: later, ttlMs: TTL_MS });

    await expect(findViewerBySession(db, 'hash-a', NOW + TTL_MS + 1)).resolves.toEqual({
      userId: 'user-a',
      isGuest: true,
    });
  });
});

describe('deleteSession', () => {
  it('signs the viewer out without touching what they wrote', async () => {
    const { userId } = await createGuestSession(db, {
      tokenHash: 'hash-a',
      userId: 'user-a',
      now: NOW,
      ttlMs: TTL_MS,
    });
    await createDraft(db, userId, { wish: '留著' }, { id: 'm1', now: NOW });

    await deleteSession(db, 'hash-a');

    await expect(findViewerBySession(db, 'hash-a', NOW)).resolves.toBeNull();
    await expect(getManifestation(db, userId, 'm1')).resolves.toMatchObject({ wish: '留著' });
  });
});

describe('deleteExpiredSessions', () => {
  it('clears out only the expired ones', async () => {
    await createGuestSession(db, {
      tokenHash: 'old',
      userId: 'user-old',
      now: NOW - TTL_MS - 1,
      ttlMs: TTL_MS,
    });
    await createGuestSession(db, {
      tokenHash: 'fresh',
      userId: 'user-fresh',
      now: NOW,
      ttlMs: TTL_MS,
    });

    await deleteExpiredSessions(db, NOW);

    await expect(findViewerBySession(db, 'old', NOW)).resolves.toBeNull();
    await expect(findViewerBySession(db, 'fresh', NOW)).resolves.toMatchObject({
      userId: 'user-fresh',
    });
  });
});

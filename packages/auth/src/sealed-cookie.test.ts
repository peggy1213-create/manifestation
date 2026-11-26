import { describe, expect, it } from 'vitest';
import { base64UrlEncode, randomBase64Url } from './base64';
import { importCookieKey, open, seal } from './sealed-cookie';

const NOW = 1_800_000_000_000;
const TEN_MINUTES = 10 * 60 * 1000;

async function freshKey() {
  return importCookieKey(randomBase64Url(32));
}

describe('sealed cookie', () => {
  it('seals a value and opens it again', async () => {
    const key = await freshKey();
    const sealed = await seal(key, { state: 'abc', nonce: 'xyz' }, TEN_MINUTES, NOW);

    expect(sealed).not.toContain('abc');
    expect(await open(key, sealed, NOW + 1000)).toEqual({ state: 'abc', nonce: 'xyz' });
  });

  it('never produces the same cookie twice for the same value', async () => {
    const key = await freshKey();
    const a = await seal(key, { state: 'abc' }, TEN_MINUTES, NOW);
    const b = await seal(key, { state: 'abc' }, TEN_MINUTES, NOW);
    expect(a).not.toBe(b);
  });

  it('refuses a cookie sealed with another key', async () => {
    const sealed = await seal(await freshKey(), { state: 'abc' }, TEN_MINUTES, NOW);
    expect(await open(await freshKey(), sealed, NOW)).toBeNull();
  });

  it('refuses a cookie whose bytes were changed', async () => {
    const key = await freshKey();
    const sealed = await seal(key, { state: 'abc' }, TEN_MINUTES, NOW);

    const tampered = `${sealed.slice(0, -4)}${sealed.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA'}`;
    expect(await open(key, tampered, NOW)).toBeNull();
  });

  it('refuses a cookie that has run out of time', async () => {
    const key = await freshKey();
    const sealed = await seal(key, { state: 'abc' }, TEN_MINUTES, NOW);

    expect(await open(key, sealed, NOW + TEN_MINUTES - 1)).not.toBeNull();
    expect(await open(key, sealed, NOW + TEN_MINUTES)).toBeNull();
    expect(await open(key, sealed, NOW + TEN_MINUTES + 1)).toBeNull();
  });

  it('refuses rubbish rather than throwing', async () => {
    const key = await freshKey();
    for (const value of ['', 'not-a-cookie', base64UrlEncode(new Uint8Array(8)), '!!!']) {
      expect(await open(key, value, NOW)).toBeNull();
    }
  });

  it('insists on a 32-byte key', async () => {
    await expect(importCookieKey(randomBase64Url(16))).rejects.toThrow(TypeError);
    await expect(importCookieKey('not base64url at all!!')).rejects.toThrow();
  });
});

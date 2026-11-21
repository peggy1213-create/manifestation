import { describe, expect, it } from 'vitest';
import { base64UrlEncode, randomBytes, toHex } from './encoding';
import { AuthError } from './errors';
import { importCookieKey, seal, unseal } from './seal';

const keyMaterial = base64UrlEncode(randomBytes(32));

describe('sealed cookies (AES-GCM)', () => {
  it('round-trips a payload', async () => {
    const key = await importCookieKey(keyMaterial);
    const sealed = await seal(key, { codeVerifier: 'v', returnTo: '/app/顯化' });
    expect(sealed).toMatch(/^[A-Za-z0-9_-]+$/);
    await expect(unseal(key, sealed)).resolves.toEqual({
      codeVerifier: 'v',
      returnTo: '/app/顯化',
    });
  });

  it('uses a fresh IV, so the same payload seals differently each time', async () => {
    const key = await importCookieKey(keyMaterial);
    const a = await seal(key, { state: 's' });
    const b = await seal(key, { state: 's' });
    expect(a).not.toBe(b);
  });

  it('refuses a payload sealed with another key', async () => {
    const key = await importCookieKey(keyMaterial);
    const other = await importCookieKey(base64UrlEncode(randomBytes(32)));
    await expect(unseal(other, await seal(key, { state: 's' }))).resolves.toBeNull();
  });

  it('refuses a tampered or truncated seal', async () => {
    const key = await importCookieKey(keyMaterial);
    const sealed = await seal(key, { state: 's' });
    const flipped = `${sealed.slice(0, -2)}${sealed.endsWith('A') ? 'B' : 'A'}`;
    await expect(unseal(key, flipped)).resolves.toBeNull();
    await expect(unseal(key, sealed.slice(0, 8))).resolves.toBeNull();
    await expect(unseal(key, 'not a seal!')).resolves.toBeNull();
    await expect(unseal(key, '')).resolves.toBeNull();
  });

  it('accepts base64url, base64 and hex key material', async () => {
    const raw = randomBytes(32);
    const fromUrl = await importCookieKey(base64UrlEncode(raw));
    const fromHex = await importCookieKey(toHex(raw));
    const sealed = await seal(fromUrl, { state: 's' });
    await expect(unseal(fromHex, sealed)).resolves.toEqual({ state: 's' });
  });

  it('rejects a COOKIE_KEY that is not 32 bytes', async () => {
    await expect(importCookieKey(base64UrlEncode(randomBytes(16)))).rejects.toThrow(AuthError);
    await expect(importCookieKey('')).rejects.toThrow(AuthError);
  });
});

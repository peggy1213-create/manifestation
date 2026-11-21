import { describe, expect, it } from 'vitest';
import { base64UrlDecode } from './encoding';
import {
  clearedSessionCookie,
  createSessionToken,
  hashSessionToken,
  sessionCookie,
  shouldRenewSession,
  SESSION_COOKIE_NAME,
  SESSION_RENEW_AFTER_SECONDS,
  SESSION_TTL_SECONDS,
} from './session';

describe('session tokens', () => {
  it('is 32 random bytes, base64url', () => {
    const token = createSessionToken();
    expect(base64UrlDecode(token)).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createSessionToken()));
    expect(tokens.size).toBe(200);
  });
});

describe('hashSessionToken', () => {
  it('is SHA-256, lowercase hex — the only form stored in D1', async () => {
    // Known vector: SHA-256("abc").
    await expect(hashSessionToken('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    const hash = await hashSessionToken(createSessionToken());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable for one token and different for another', async () => {
    const token = createSessionToken();
    expect(await hashSessionToken(token)).toBe(await hashSessionToken(token));
    expect(await hashSessionToken(token)).not.toBe(await hashSessionToken(createSessionToken()));
  });

  it('cannot be reversed to the token (the hash does not contain it)', async () => {
    const token = createSessionToken();
    expect(await hashSessionToken(token)).not.toContain(token);
  });
});

describe('session cookie', () => {
  it('is HttpOnly, Secure, SameSite=Lax, Path=/ and 30 days', () => {
    const cookie = sessionCookie('token-value');
    expect(cookie.startsWith(`${SESSION_COOKIE_NAME}=token-value;`)).toBe(true);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
    expect(SESSION_TTL_SECONDS).toBe(60 * 60 * 24 * 30);
  });

  it('clears with Max-Age=0', () => {
    const cookie = clearedSessionCookie();
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('HttpOnly');
  });
});

describe('rolling renewal', () => {
  const now = 1_700_000_000_000;

  it('does not write on every request', () => {
    expect(shouldRenewSession(now - 60_000, now)).toBe(false);
  });

  it('renews once a session has not been touched for a day', () => {
    expect(shouldRenewSession(now - SESSION_RENEW_AFTER_SECONDS * 1000, now)).toBe(true);
    expect(shouldRenewSession(now - 40 * 60 * 60 * 1000, now)).toBe(true);
  });
});

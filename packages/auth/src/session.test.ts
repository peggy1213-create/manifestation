import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  createSessionToken,
  hashSessionToken,
  isSameOrigin,
  isSessionTokenShaped,
  sessionCookieOptions,
} from './index';

describe('createSessionToken', () => {
  it('is url-safe and long enough to be unguessable', () => {
    const token = createSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(isSessionTokenShaped(token)).toBe(true);
  });

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 50 }, createSessionToken));
    expect(tokens.size).toBe(50);
  });
});

describe('hashSessionToken', () => {
  it('is SHA-256 hex, so the token itself never has to be stored', async () => {
    await expect(hashSessionToken('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('gives a different hash for a different token', async () => {
    const [a, b] = await Promise.all([hashSessionToken('a'), hashSessionToken('b')]);
    expect(a).not.toBe(b);
  });
});

describe('isSessionTokenShaped', () => {
  it('rejects anything that is not a token we issued', () => {
    for (const value of [
      '',
      'short',
      'has spaces in it and is long enough to pass length',
      'a'.repeat(100),
    ]) {
      expect(isSessionTokenShaped(value)).toBe(false);
    }
  });
});

describe('sessionCookieOptions', () => {
  it('is HttpOnly, Secure and SameSite=Lax with a 30-day life', () => {
    expect(sessionCookieOptions()).toEqual({
      name: SESSION_COOKIE_NAME,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_MS / 1000,
    });
  });

  it('can drop Secure for local http development', () => {
    expect(sessionCookieOptions({ secure: false }).secure).toBe(false);
  });
});

describe('isSameOrigin', () => {
  it('accepts a request from our own host', () => {
    expect(isSameOrigin('https://clearpath.tw', 'clearpath.tw')).toBe(true);
    expect(isSameOrigin('http://localhost:3000', 'localhost:3000')).toBe(true);
  });

  it('rejects another origin, a missing Origin header and nonsense', () => {
    expect(isSameOrigin('https://evil.example', 'clearpath.tw')).toBe(false);
    expect(isSameOrigin(null, 'clearpath.tw')).toBe(false);
    expect(isSameOrigin('https://clearpath.tw', null)).toBe(false);
    expect(isSameOrigin('not a url', 'clearpath.tw')).toBe(false);
  });
});

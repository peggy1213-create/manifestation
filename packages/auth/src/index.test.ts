import { describe, expect, it } from 'vitest';
import {
  AUTH_PACKAGE_NAME,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  hashSessionToken,
  isSameOrigin,
  newSessionToken,
  sessionCookieOptions,
  sessionExpiresAt,
  shouldRenewSession,
} from './index';

describe('@clearpath/auth', () => {
  it('exposes its package name as a sanity check', () => {
    expect(AUTH_PACKAGE_NAME).toBe('@clearpath/auth');
  });
});

describe('session tokens', () => {
  it('mints url-safe tokens that do not repeat', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => newSessionToken()));
    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('hashes a token to stable lowercase hex, and different tokens differ', async () => {
    const hash = await hashSessionToken('a-token');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashSessionToken('a-token')).toBe(hash);
    expect(await hashSessionToken('another-token')).not.toBe(hash);
  });

  it('never returns the token itself as the hash', async () => {
    const token = newSessionToken();
    expect(await hashSessionToken(token)).not.toBe(token);
  });
});

describe('session cookie', () => {
  it('is HttpOnly, Secure and SameSite=Lax by default', () => {
    expect(SESSION_COOKIE).toBe('cp_session');
    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 2_592_000,
    });
  });

  it('can drop Secure for plain-HTTP localhost only when asked', () => {
    expect(sessionCookieOptions({ secure: false }).secure).toBe(false);
  });

  it('rolls 30 days forward, renewing at most once a day', () => {
    const now = 1_800_000_000_000;
    expect(sessionExpiresAt(now)).toBe(now + SESSION_TTL_MS);
    expect(shouldRenewSession(sessionExpiresAt(now), now)).toBe(false);
    expect(shouldRenewSession(sessionExpiresAt(now - 2 * 86_400_000), now)).toBe(true);
  });
});

describe('origin check', () => {
  function request(headers: Record<string, string>) {
    return { url: 'https://clearpath.example/api/checkins', headers: new Headers(headers) };
  }

  it('accepts a same-origin request', () => {
    expect(isSameOrigin(request({ origin: 'https://clearpath.example' }))).toBe(true);
    expect(isSameOrigin(request({ referer: 'https://clearpath.example/app/1' }))).toBe(true);
  });

  it('refuses a cross-origin or origin-less request', () => {
    expect(isSameOrigin(request({ origin: 'https://evil.example' }))).toBe(false);
    expect(isSameOrigin(request({ referer: 'https://evil.example/app/1' }))).toBe(false);
    expect(isSameOrigin(request({ referer: 'not a url' }))).toBe(false);
    expect(isSameOrigin(request({}))).toBe(false);
  });

  it('prefers Origin over Referer when both are present', () => {
    expect(
      isSameOrigin(
        request({ origin: 'https://evil.example', referer: 'https://clearpath.example/app/1' }),
      ),
    ).toBe(false);
  });
});

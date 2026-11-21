import { clearCookie, serializeCookie } from './cookies';
import { randomToken, toHex, utf8Bytes } from './encoding';

export const SESSION_COOKIE_NAME = 'cp_session';

/** 30 days, rolling: every renewal pushes the expiry 30 days out again. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/** Renew at most once a day, so reading a page is not a write per request. */
export const SESSION_RENEW_AFTER_SECONDS = 60 * 60 * 24;

export const SESSION_TOKEN_BYTES = 32;

/** 32 random bytes, base64url. This value only ever lives in the cookie. */
export function createSessionToken(): string {
  return randomToken(SESSION_TOKEN_BYTES);
}

/** Lowercase hex SHA-256. Only this is stored in D1. */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8Bytes(token));
  return toHex(new Uint8Array(digest));
}

export function sessionCookie(token: string, maxAgeSeconds = SESSION_TTL_SECONDS): string {
  return serializeCookie(SESSION_COOKIE_NAME, token, {
    maxAge: maxAgeSeconds,
    sameSite: 'Lax',
    httpOnly: true,
    secure: true,
    path: '/',
  });
}

export function clearedSessionCookie(): string {
  return clearCookie(SESSION_COOKIE_NAME);
}

/**
 * True when a session's `lastUsedAt` is old enough to be worth writing a fresh
 * expiry for.
 */
export function shouldRenewSession(
  lastUsedAt: number,
  now = Date.now(),
  renewAfterSeconds = SESSION_RENEW_AFTER_SECONDS,
): boolean {
  return now - lastUsedAt >= renewAfterSeconds * 1000;
}

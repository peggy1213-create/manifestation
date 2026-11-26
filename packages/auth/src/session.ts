/**
 * Session cookies. Web Crypto only — no auth libraries, no Node crypto.
 *
 * The cookie carries 32 random bytes. Only the SHA-256 hash of that token is
 * stored in D1, so the database alone cannot be replayed as a login.
 */

import { randomBase64Url, sha256, toHex, utf8 } from './base64';

export const SESSION_COOKIE = 'cp_session';

/** 30-day rolling expiry: mutating requests push it out again. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Renew at most once a day, so a read-heavy day is not a write-heavy one. */
export const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32;

/** A fresh opaque session token. Never stored; only its hash is. */
export function newSessionToken(): string {
  return randomBase64Url(TOKEN_BYTES);
}

/** SHA-256 of the token, lowercase hex. The only form that reaches D1. */
export async function hashSessionToken(token: string): Promise<string> {
  return toHex(await sha256(utf8(token)));
}

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}

/**
 * HttpOnly, Secure, SameSite=Lax. Secure is dropped only on plain-HTTP
 * localhost, where the browser would otherwise refuse the cookie outright.
 */
export function sessionCookieOptions(options: { secure?: boolean } = {}): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: options.secure ?? true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function sessionExpiresAt(now: number = Date.now()): number {
  return now + SESSION_TTL_MS;
}

/** True once the stored expiry has drifted more than a day from a fresh one. */
export function shouldRenewSession(expiresAt: number, now: number = Date.now()): boolean {
  return sessionExpiresAt(now) - expiresAt > SESSION_RENEW_AFTER_MS;
}

/**
 * Origin check for mutating requests. A same-origin POST carries an Origin (or
 * at least a Referer) that matches the request URL; anything else is refused
 * before it can write.
 */
export function isSameOrigin(request: {
  headers: { get(name: string): string | null };
  url: string;
}): boolean {
  const target = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin) return origin === target;

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === target;
    } catch {
      return false;
    }
  }
  return false;
}

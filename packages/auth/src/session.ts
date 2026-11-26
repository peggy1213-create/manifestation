/**
 * Session cookies. Web Crypto only — no auth libraries, no Node crypto.
 *
 * The cookie carries 32 random bytes. Only the SHA-256 hash of that token is
 * stored in D1, so the database alone cannot be replayed as a login.
 */

export const SESSION_COOKIE = 'cp_session';

/** 30-day rolling expiry: mutating requests push it out again. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Renew at most once a day, so a read-heavy day is not a write-heavy one. */
export const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32;

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

/** A fresh opaque session token. Never stored; only its hash is. */
export function newSessionToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

/** SHA-256 of the token, lowercase hex. The only form that reaches D1. */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
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

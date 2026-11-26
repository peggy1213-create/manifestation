// Session tokens. Web Crypto only — no auth libraries, no Node crypto.
// The cookie carries a random 32-byte token; D1 only ever stores its SHA-256 hash.

export const SESSION_COOKIE_NAME = 'cp_session';

/** 30-day rolling expiry. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A fresh, unguessable session token. Hand it to the browser; never store it. */
export function createSessionToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

/** SHA-256 of the token, lowercase hex. This is the only form that reaches the database. */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Looks like a token this app issued? Cheap guard before a database round trip. */
export function isSessionTokenShaped(value: string): boolean {
  return /^[A-Za-z0-9_-]{40,64}$/.test(value);
}

export interface SessionCookieOptions {
  secure?: boolean;
  maxAgeMs?: number;
}

/** Cookie attributes for the session token: HttpOnly, Secure, SameSite=Lax. */
export function sessionCookieOptions(options: SessionCookieOptions = {}) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: options.secure ?? true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor((options.maxAgeMs ?? SESSION_TTL_MS) / 1000),
  };
}

/**
 * Origin check for every mutating request: the Origin header must match this app's host.
 * A missing Origin is rejected — browsers send it on every same-site POST.
 */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  hashSessionToken,
  isSameOrigin,
  sessionCookieOptions,
  sessionExpiresAt,
  shouldRenewSession,
} from '@clearpath/auth';
import { extendSession, findSessionByHash, type SessionRecord } from '@clearpath/core';
import { getDatabase } from './cloudflare';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // A person's own records are never cached by a shared cache.
      'cache-control': 'no-store',
    },
  });
}

export function errorResponse(code: string, status: number): Response {
  return jsonResponse({ error: code }, status);
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

export async function sessionFromRequest(request: Request): Promise<SessionRecord | null> {
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  if (!token) return null;

  const db = await getDatabase();
  return findSessionByHash(db, await hashSessionToken(token));
}

/**
 * The gate every mutating route goes through: same-origin, then signed in.
 * Returns the session, or the response to send instead.
 */
export async function requireMutatingSession(
  request: Request,
): Promise<{ session: SessionRecord } | { response: Response }> {
  if (!isSameOrigin(request)) {
    return { response: errorResponse('bad_origin', 403) };
  }

  const session = await sessionFromRequest(request);
  if (!session) {
    return { response: errorResponse('unauthenticated', 401) };
  }

  return { session };
}

/**
 * Pushes the 30-day rolling expiry out, at most once a day. Only mutating
 * handlers call this: server components must not write cookies.
 */
export async function renewSessionIfStale(session: SessionRecord): Promise<void> {
  if (!shouldRenewSession(session.expiresAt)) return;

  const db = await getDatabase();
  const expiresAt = sessionExpiresAt();
  await extendSession(db, session.tokenHash, expiresAt);

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;

  // Secure is kept on everywhere: browsers treat http://localhost as a secure
  // context, so `pnpm preview` accepts the cookie too.
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

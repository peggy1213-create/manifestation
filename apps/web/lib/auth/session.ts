import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createSessionToken,
  hashSessionToken,
  readCookie,
  sessionCookie,
  shouldRenewSession,
  SESSION_COOKIE_NAME,
} from '@clearpath/auth';
import {
  createSession,
  deleteSessionByTokenHash,
  findActiveSession,
  renewSession,
  type UserRow,
} from '@clearpath/core';
import { getDatabase } from '../env';

export interface AppSession {
  user: Pick<UserRow, 'id' | 'email' | 'name'>;
  sessionId: string;
  expiresAt: number;
}

/**
 * The signed-in account behind the session cookie, or `null`. Pass the
 * `Request` in a route handler or middleware; in a server component call it
 * with no argument and it reads the request's cookies.
 *
 * Rolling renewal happens here: once a session has not been used for a day,
 * its expiry is pushed 30 days out again. Middleware re-sets the cookie with a
 * fresh Max-Age, so a daily visitor never gets signed out.
 */
export async function getSession(request?: Request): Promise<AppSession | null> {
  const token = request
    ? readCookie(request, SESSION_COOKIE_NAME)
    : (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getDatabase();
  const now = Date.now();
  const active = await findActiveSession(db, await hashSessionToken(token), now);
  if (!active) return null;

  if (shouldRenewSession(active.session.lastUsedAt, now)) {
    await renewSession(db, active.session.id, { now });
  }

  return {
    user: { id: active.user.id, email: active.user.email, name: active.user.name },
    sessionId: active.session.id,
    expiresAt: active.session.expiresAt,
  };
}

/** For pages under /app: the session, or a redirect to /login. */
export async function requireSession(returnTo = '/app'): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return session;
}

/**
 * Starts a session for an account: 32 random bytes as the cookie token, only
 * its SHA-256 in D1. Returns the `Set-Cookie` value to send back.
 */
export async function startSession(userId: string): Promise<{ setCookie: string }> {
  const token = createSessionToken();
  await createSession(getDatabase(), { userId, tokenHash: await hashSessionToken(token) });
  return { setCookie: sessionCookie(token) };
}

/** Ends the session the cookie points at. Unknown tokens are a no-op. */
export async function endSession(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return;
  await deleteSessionByTokenHash(getDatabase(), await hashSessionToken(token));
}

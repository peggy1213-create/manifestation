import { cookies } from 'next/headers';
import { SESSION_COOKIE, hashSessionToken } from '@clearpath/auth';
import { findUserBySessionHash, type SessionUser } from '@clearpath/core';
import { getDatabase } from './cloudflare';

/**
 * Resolves the signed-in person from the session cookie: the cookie holds an
 * opaque token, D1 holds only its SHA-256 hash.
 *
 * Reading never writes. The 30-day rolling expiry is pushed out from mutating
 * route handlers, which are allowed to set cookies.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDatabase();
  return findUserBySessionHash(db, await hashSessionToken(token));
}

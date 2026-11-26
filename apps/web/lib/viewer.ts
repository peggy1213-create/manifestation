import { cookies, headers } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  createSessionToken,
  hashSessionToken,
  isSameOrigin,
  isSessionTokenShaped,
  sessionCookieOptions,
} from '@clearpath/auth';
import {
  createGuestSession,
  findViewerBySession,
  touchSession,
  type Viewer,
} from '@clearpath/core/repo';
import { getDb } from './db';

export type { Viewer };

/**
 * Who is reading this page — a guest with a session cookie, a signed-in member, or nobody.
 * Read-only, so it is safe in a server component: it never sets a cookie.
 */
export async function getViewer(): Promise<Viewer | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token || !isSessionTokenShaped(token)) return null;

  const db = await getDb();
  return findViewerBySession(db, await hashSessionToken(token));
}

/**
 * Who is writing — creating a guest session on the spot if there is none, so writing a 顯化
 * never waits for a sign-in. Sets a cookie, so only a server action or route handler may
 * call it. A guest is a real user row: signing in later keeps everything they wrote.
 */
export async function getOrCreateViewer(): Promise<Viewer> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const db = await getDb();
  const secure = await isSecureRequest();

  if (token && isSessionTokenShaped(token)) {
    const tokenHash = await hashSessionToken(token);
    const viewer = await findViewerBySession(db, tokenHash);
    if (viewer) {
      // 30-day rolling expiry: push the stored session and the cookie out together.
      await touchSession(db, tokenHash, { ttlMs: SESSION_TTL_MS });
      jar.set({ ...sessionCookieOptions({ secure }), value: token });
      return viewer;
    }
  }

  const freshToken = createSessionToken();
  const viewer = await createGuestSession(db, {
    tokenHash: await hashSessionToken(freshToken),
    ttlMs: SESSION_TTL_MS,
  });
  jar.set({ ...sessionCookieOptions({ secure }), value: freshToken });
  return viewer;
}

/** Origin check for every mutating request, on top of what Next.js already enforces. */
export async function assertSameOrigin(): Promise<void> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (!isSameOrigin(headerList.get('origin'), host)) {
    throw new Error('Cross-origin request rejected');
  }
}

async function isSecureRequest(): Promise<boolean> {
  const headerList = await headers();
  const proto = headerList.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0]?.trim() === 'https';
  return (headerList.get('host') ?? '').startsWith('localhost') === false;
}

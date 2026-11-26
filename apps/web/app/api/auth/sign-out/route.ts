import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  hashSessionToken,
  isSameOrigin,
  sessionCookieOptions,
} from '@clearpath/auth';
import { deleteSession } from '@clearpath/core';
import { getDatabase } from '@/lib/cloudflare';
import { errorResponse } from '@/lib/api';

/**
 * Signs out. The session row goes from D1, so the token cannot be used again
 * even if the cookie is still lying around somewhere.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse('bad_origin', 403);

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    const db = await getDatabase();
    await deleteSession(db, await hashSessionToken(token));
  }

  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });

  return new Response(null, {
    status: 303,
    headers: { location: new URL('/', request.url).toString(), 'cache-control': 'no-store' },
  });
}

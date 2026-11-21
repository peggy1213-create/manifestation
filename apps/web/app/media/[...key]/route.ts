// GET /media/users/{userId}/{manifestationId}/{uuid}.jpg
//
// Photos live in a private R2 bucket and are never public. This route checks the
// session cookie, checks the key sits under that user's own prefix, then streams
// the object. All of that lives in @clearpath/core so it can be tested in the
// Workers runtime; this file only unwraps the request.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createDb, SESSION_COOKIE_NAME, serveMedia } from '@clearpath/core';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await context.params;
  const { env } = getCloudflareContext();
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;

  return serveMedia({
    db: createDb(env.DB),
    bucket: env.BOARD,
    sessionToken: token,
    key: key.join('/'),
    ifNoneMatch: request.headers.get('If-None-Match'),
  });
}

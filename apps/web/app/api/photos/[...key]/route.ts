import { getBoardBucket } from '@/lib/cloudflare';
import { errorResponse, sessionFromRequest } from '@/lib/api';

/**
 * The only way a 足跡 photo leaves R2. The bucket is private; this handler
 * serves an object solely to the person whose prefix it sits under.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const session = await sessionFromRequest(request);
  if (!session) return errorResponse('unauthenticated', 401);

  const { key: segments } = await params;
  const key = segments.map((segment) => decodeURIComponent(segment)).join('/');

  // Ownership is the key prefix, so another person's object is simply not found.
  if (!key.startsWith(`users/${session.user.id}/`)) {
    return errorResponse('not_found', 404);
  }

  const object = await (await getBoardBucket()).get(key);
  if (!object) return errorResponse('not_found', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  // Private, so no shared cache ever holds someone's photo.
  headers.set('cache-control', 'private, max-age=60, must-revalidate');
  headers.set('content-security-policy', "default-src 'none'; sandbox");
  headers.set('x-content-type-options', 'nosniff');

  return new Response(object.body, { headers });
}

// R2 object keys and the ownership check behind GET /media/[...key].
// Photos stay in our own private bucket and are only ever served through an
// authenticated Worker route.

import type { Db } from '../db/client';
import { resolveSession } from './sessions';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const MEDIA_KEY_RE = new RegExp(`^users/(${UUID})/(${UUID})/(${UUID})\\.jpg$`);

export const MEDIA_CONTENT_TYPE = 'image/jpeg';

export interface ParsedMediaKey {
  userId: string;
  manifestationId: string;
  fileId: string;
}

/** Every key a user may read starts with this. */
export function mediaPrefix(userId: string): string {
  return `users/${userId}/`;
}

/** users/{userId}/{manifestationId}/{uuid}.jpg */
export function buildMediaKey(
  userId: string,
  manifestationId: string,
  fileId: string = crypto.randomUUID(),
): string {
  const key = `users/${userId}/${manifestationId}/${fileId}.jpg`;
  if (!MEDIA_KEY_RE.test(key)) {
    throw new Error('Invalid media key: userId, manifestationId and fileId must be uuids');
  }
  return key;
}

/**
 * Parses a key coming from a URL. Returns null for anything that is not an
 * exact users/{uuid}/{uuid}/{uuid}.jpg — which also rules out '..' segments,
 * absolute keys and listing prefixes.
 */
export function parseMediaKey(key: string): ParsedMediaKey | null {
  const match = MEDIA_KEY_RE.exec(key);
  if (!match) return null;
  const [, userId, manifestationId, fileId] = match;
  if (!userId || !manifestationId || !fileId) return null;
  return { userId, manifestationId, fileId };
}

/** True only when the key is well-formed and sits under this user's prefix. */
export function ownsMediaKey(userId: string, key: string): boolean {
  const parsed = parseMediaKey(key);
  return parsed !== null && parsed.userId === userId && key.startsWith(mediaPrefix(userId));
}

/**
 * Streams one of the user's own photos out of R2. Returns null when the key is
 * not theirs or the object is gone — the route turns both into a 404, so a key
 * never reveals whether another user's photo exists.
 */
export async function getOwnMedia(
  bucket: R2Bucket,
  userId: string,
  key: string,
): Promise<R2ObjectBody | null> {
  if (!ownsMediaKey(userId, key)) return null;
  return bucket.get(key);
}

/** Stores a photo under the user's own prefix and returns its key. */
export async function putOwnMedia(
  bucket: R2Bucket,
  userId: string,
  manifestationId: string,
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
  fileId?: string,
): Promise<string> {
  const key = buildMediaKey(userId, manifestationId, fileId);
  await bucket.put(key, body, { httpMetadata: { contentType: MEDIA_CONTENT_TYPE } });
  return key;
}

/** Deletes one of the user's own photos. No-op for a key that is not theirs. */
export async function deleteOwnMedia(
  bucket: R2Bucket,
  userId: string,
  key: string,
): Promise<boolean> {
  if (!ownsMediaKey(userId, key)) return false;
  await bucket.delete(key);
  return true;
}

export interface ServeMediaInput {
  db: Db;
  bucket: R2Bucket;
  /** Raw session cookie value, or null when the cookie is absent. */
  sessionToken: string | null;
  /** Object key from the URL, e.g. users/{uuid}/{uuid}/{uuid}.jpg */
  key: string;
  /** Value of the request's If-None-Match header, if any. */
  ifNoneMatch?: string | null;
  now?: Date;
}

/**
 * The whole of GET /media/[...key]: resolve the session, check the key belongs
 * to that user, then stream the object out of our private R2 bucket.
 *
 * 401 without a valid session; 404 both for "not yours" and "not there", so a
 * key can never tell one user that another user's photo exists.
 */
export async function serveMedia(input: ServeMediaInput): Promise<Response> {
  const token = input.sessionToken;
  if (!token) return new Response('未登入', { status: 401 });

  const resolved = await resolveSession(input.db, token, input.now);
  if (!resolved) return new Response('未登入', { status: 401 });

  const object = await getOwnMedia(input.bucket, resolved.user.id, input.key);
  if (!object) return new Response('找不到這個檔案', { status: 404 });

  const headers = new Headers({
    'Content-Type': object.httpMetadata?.contentType ?? MEDIA_CONTENT_TYPE,
    'Content-Length': String(object.size),
    ETag: object.httpEtag,
    // Private by default: the user's own browser may cache it, nothing else.
    'Cache-Control': 'private, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  });

  if (input.ifNoneMatch && input.ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { status: 200, headers });
}

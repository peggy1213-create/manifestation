import { findManifestation, isDayKey } from '@clearpath/core';
import { getBoardBucket, getDatabase } from '@/lib/cloudflare';
import { errorResponse, jsonResponse, requireMutatingSession } from '@/lib/api';

/** Already resized to 1200px in the browser; this is a sanity ceiling, not a target. */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Receives one 足跡 photo and stores it in the private R2 bucket under the
 * owner's own prefix. Nothing is public: photos come back only through
 * /api/photos, which checks the session against that prefix.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const gate = await requireMutatingSession(request);
  if ('response' in gate) return gate.response;

  const { id } = await params;
  const userId = gate.session.user.id;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse('bad_request', 400);
  }

  const photo = form.get('photo');
  const dayDate = form.get('dayDate');

  if (!(photo instanceof File) || typeof dayDate !== 'string' || !isDayKey(dayDate)) {
    return errorResponse('bad_request', 400);
  }
  if (!ALLOWED_TYPES.has(photo.type)) {
    return errorResponse('unsupported_type', 415);
  }
  if (photo.size === 0 || photo.size > MAX_UPLOAD_BYTES) {
    return errorResponse('too_large', 413);
  }

  const db = await getDatabase();
  const manifestation = await findManifestation(db, userId, id);
  if (!manifestation) return errorResponse('not_found', 404);

  // One key per day: recording the day again overwrites the photo instead of
  // leaving an orphan behind in the bucket.
  const key = `users/${userId}/manifestations/${manifestation.id}/checkins/${dayDate}.jpg`;

  const bucket = await getBoardBucket();
  await bucket.put(key, await photo.arrayBuffer(), {
    httpMetadata: { contentType: photo.type, cacheControl: 'private, max-age=0, must-revalidate' },
    customMetadata: { userId, manifestationId: manifestation.id, dayDate },
  });

  return jsonResponse({ key });
}

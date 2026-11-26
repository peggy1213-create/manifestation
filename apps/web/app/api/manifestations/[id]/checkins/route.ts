import {
  NotFoundError,
  isCheckinStatus,
  isDayKey,
  saveCheckin,
  type CheckinStatus,
} from '@clearpath/core';
import { getDatabase } from '@/lib/cloudflare';
import {
  errorResponse,
  jsonResponse,
  renewSessionIfStale,
  requireMutatingSession,
} from '@/lib/api';

interface CheckinBody {
  dayDate: string;
  status: CheckinStatus;
  note: string | null;
  cueStepIds: string[];
  photoKey: string | null;
  clientId: string | null;
}

function parseBody(value: unknown): CheckinBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const body = value as Record<string, unknown>;

  if (!isDayKey(body.dayDate) || !isCheckinStatus(body.status)) return null;

  const cueStepIds = Array.isArray(body.cueStepIds)
    ? body.cueStepIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    dayDate: body.dayDate,
    status: body.status,
    note: typeof body.note === 'string' ? body.note : null,
    cueStepIds,
    photoKey: typeof body.photoKey === 'string' ? body.photoKey : null,
    clientId: typeof body.clientId === 'string' ? body.clientId : null,
  };
}

/** 記下今天. Saving the same day again replaces it, which is what makes replaying the offline outbox safe. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const gate = await requireMutatingSession(request);
  if ('response' in gate) return gate.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('bad_request', 400);
  }

  const body = parseBody(payload);
  if (!body) return errorResponse('bad_request', 400);

  const { id } = await params;
  const userId = gate.session.user.id;

  // A photo key always sits under the owner's own prefix, whoever sent it.
  if (body.photoKey && !body.photoKey.startsWith(`users/${userId}/`)) {
    return errorResponse('bad_request', 400);
  }

  const db = await getDatabase();

  try {
    const checkin = await saveCheckin(db, userId, {
      manifestationId: id,
      dayDate: body.dayDate,
      status: body.status,
      note: body.note,
      photoKey: body.photoKey,
      cueStepIds: body.cueStepIds,
      clientId: body.clientId,
    });

    await renewSessionIfStale(gate.session);
    return jsonResponse({ checkin });
  } catch (error) {
    if (error instanceof NotFoundError) return errorResponse('not_found', 404);
    throw error;
  }
}

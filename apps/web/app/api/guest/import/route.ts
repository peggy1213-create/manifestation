import { isSameOrigin } from '@clearpath/auth';
import {
  createManifestation,
  listManifestationSummaries,
  parseGuestDraft,
  planGuestMerge,
} from '@clearpath/core';
import { getAppOrigin, getDatabase } from '@/lib/env';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export type GuestImportOutcome = 'moved' | 'already-in-account' | 'account-not-empty' | 'no-draft';

export interface GuestImportResponse {
  outcome: GuestImportOutcome;
  /** Set when the move added a 顯化. */
  manifestationId?: string;
}

/**
 * Moves the one 顯化 someone wrote in guest mode (localStorage) into their
 * account. The account always wins: an existing 顯化 is never overwritten, and
 * sending the same draft twice adds nothing.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request, { expectedOrigin: getAppOrigin(request) })) {
    return json({ error: 'bad_origin' }, 403);
  }

  const session = await getSession(request);
  if (!session) return json({ error: 'unauthenticated' }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  const draft = parseGuestDraft((body as { draft?: unknown } | null)?.draft);
  const db = getDatabase();
  const plan = planGuestMerge(draft, await listManifestationSummaries(db, session.user.id));

  if (plan.action === 'skip') {
    return json({
      outcome: plan.reason === 'no-draft' ? 'no-draft' : plan.reason,
    } satisfies GuestImportResponse);
  }

  const created = await createManifestation(db, session.user.id, {
    wish: plan.draft.wish,
    outcome: plan.draft.outcome,
    obstacle: plan.draft.obstacle,
    plan: plan.draft.plan,
    source: 'guest',
    createdAt: plan.draft.createdAt,
  });

  return json({ outcome: 'moved', manifestationId: created.id } satisfies GuestImportResponse);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

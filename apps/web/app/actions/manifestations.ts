'use server';

import { revalidatePath } from 'next/cache';
import {
  emptyManifestationInput,
  type Manifestation,
  type ManifestationInput,
  type ProcessStep,
  type ValidationIssue,
} from '@clearpath/core';
import {
  activateManifestation,
  createDraft,
  releaseManifestation,
  saveManifestationInput,
  type RepoResult,
} from '@clearpath/core/repo';
import { getDb } from '@/lib/db';
import { assertSameOrigin, getOrCreateViewer } from '@/lib/viewer';

export type ActionResult =
  | { ok: true; id: string; savedAt: number; status: Manifestation['status'] }
  | { ok: false; error: 'notFound' | 'released' | 'generic' }
  | { ok: false; error: 'invalid'; issues: ValidationIssue[] };

/** Only the fields the builder owns ever cross the wire. */
function sanitiseInput(raw: unknown): Partial<ManifestationInput> {
  if (typeof raw !== 'object' || raw === null) return {};
  const value = raw as Record<string, unknown>;
  const empty = emptyManifestationInput();
  const input: Partial<ManifestationInput> = {};

  for (const key of Object.keys(empty) as (keyof ManifestationInput)[]) {
    if (key === 'steps' || key === 'likelihood') continue;
    const field = value[key];
    if (typeof field === 'string') input[key] = field;
  }

  if (Array.isArray(value.steps)) {
    input.steps = value.steps.map((step): ProcessStep => {
      const row = (typeof step === 'object' && step !== null ? step : {}) as Record<
        string,
        unknown
      >;
      return {
        action: typeof row.action === 'string' ? row.action : '',
        when: typeof row.when === 'string' ? row.when : '',
        where: typeof row.where === 'string' ? row.where : '',
      };
    });
  }

  if (typeof value.likelihood === 'number' || value.likelihood === null) {
    input.likelihood = value.likelihood;
  }

  return input;
}

function toActionResult(result: RepoResult<Manifestation>): ActionResult {
  if (result.ok) {
    return {
      ok: true,
      id: result.value.id,
      savedAt: result.value.updatedAt,
      status: result.value.status,
    };
  }
  if (result.reason === 'invalid') return { ok: false, error: 'invalid', issues: result.issues };
  return { ok: false, error: result.reason };
}

/**
 * Autosave. With no id this starts a draft — and, for a guest, a session — so nothing a
 * person writes is lost while they are still deciding whether to sign in.
 */
export async function saveDraftAction(id: string | null, raw: unknown): Promise<ActionResult> {
  await assertSameOrigin();
  const input = sanitiseInput(raw);
  const db = await getDb();
  const viewer = await getOrCreateViewer();

  if (!id) {
    const draft = await createDraft(db, viewer.userId, input);
    revalidatePath('/app');
    return { ok: true, id: draft.id, savedAt: draft.updatedAt, status: draft.status };
  }

  const result = toActionResult(await saveManifestationInput(db, viewer.userId, id, input));
  if (result.ok) revalidatePath(`/app/${id}`);
  return result;
}

/** Finish the builder: validate the whole 顯化 and start its 66-day path. */
export async function activateAction(id: string, raw: unknown): Promise<ActionResult> {
  await assertSameOrigin();
  const db = await getDb();
  const viewer = await getOrCreateViewer();

  const result = toActionResult(
    await activateManifestation(db, viewer.userId, id, sanitiseInput(raw)),
  );
  if (result.ok) {
    revalidatePath('/app');
    revalidatePath(`/app/${id}`);
  }
  return result;
}

/** 放下. Letting go counts as progress, so the 顯化 and its note stay. */
export async function releaseAction(id: string, note: string): Promise<ActionResult> {
  await assertSameOrigin();
  const db = await getDb();
  const viewer = await getOrCreateViewer();

  const result = toActionResult(
    await releaseManifestation(db, viewer.userId, id, typeof note === 'string' ? note : ''),
  );
  if (result.ok) {
    revalidatePath('/app');
    revalidatePath(`/app/${id}`);
  }
  return result;
}

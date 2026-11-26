// Every function here takes a userId and scopes its query by it. There is no RLS in D1,
// so this file is the boundary: nothing else may read or write the manifestations table.

import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { manifestations } from '../db/schema';
import {
  canEdit,
  canRelease,
  emptyManifestationInput,
  normaliseInput,
  normaliseInputForActivation,
  type Manifestation,
  type ManifestationInput,
  type ManifestationStatus,
  type ProcessStep,
} from '../manifestation';
import { validateManifestation, validateReleaseNote, type ValidationIssue } from '../validation';

export type RepoFailure =
  | { ok: false; reason: 'notFound' }
  | { ok: false; reason: 'released' }
  | { ok: false; reason: 'invalid'; issues: ValidationIssue[] };

export type RepoResult<T> = { ok: true; value: T } | RepoFailure;

export interface WriteOptions {
  /** Epoch ms. Injected so tests and the 66-day path are not at the mercy of the clock. */
  now?: number;
  /** New row id. Injected for the same reason. */
  id?: string;
}

type Row = typeof manifestations.$inferSelect;

function parseSteps(raw: string): ProcessStep[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((entry): ProcessStep[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const step = entry as Partial<ProcessStep>;
    return [
      {
        action: typeof step.action === 'string' ? step.action : '',
        when: typeof step.when === 'string' ? step.when : '',
        where: typeof step.where === 'string' ? step.where : '',
      },
    ];
  });
}

function parseStatus(raw: string): ManifestationStatus {
  return raw === 'active' || raw === 'released' ? raw : 'draft';
}

function toManifestation(row: Row): Manifestation {
  return {
    id: row.id,
    userId: row.userId,
    status: parseStatus(row.status),
    wish: row.wish,
    outcome: row.outcome,
    outcomeSee: row.outcomeSee,
    outcomeHear: row.outcomeHear,
    outcomeFeel: row.outcomeFeel,
    obstacle: row.obstacle,
    planIf: row.planIf,
    planThen: row.planThen,
    steps: parseSteps(row.steps),
    likelihood: row.likelihood,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    startedAt: row.startedAt,
    releasedAt: row.releasedAt,
    releaseNote: row.releaseNote,
  };
}

function inputColumns(input: ManifestationInput) {
  return {
    wish: input.wish,
    outcome: input.outcome,
    outcomeSee: input.outcomeSee,
    outcomeHear: input.outcomeHear,
    outcomeFeel: input.outcomeFeel,
    obstacle: input.obstacle,
    planIf: input.planIf,
    planThen: input.planThen,
    steps: JSON.stringify(input.steps),
    likelihood: input.likelihood,
  };
}

function mergeInput(partial: Partial<ManifestationInput>): ManifestationInput {
  return normaliseInput({ ...emptyManifestationInput(), ...partial });
}

/** Start a new draft for this user. Returns the row, so the builder learns its id. */
export async function createDraft(
  db: Db,
  userId: string,
  input: Partial<ManifestationInput> = {},
  options: WriteOptions = {},
): Promise<Manifestation> {
  const now = options.now ?? Date.now();
  const [row] = await db
    .insert(manifestations)
    .values({
      id: options.id ?? crypto.randomUUID(),
      userId,
      status: 'draft',
      ...inputColumns(mergeInput(input)),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) throw new Error('createDraft: insert returned no row');
  return toManifestation(row);
}

/** Read one 顯化 — only ever this user's. */
export async function getManifestation(
  db: Db,
  userId: string,
  id: string,
): Promise<Manifestation | null> {
  const [row] = await db
    .select()
    .from(manifestations)
    .where(and(eq(manifestations.id, id), eq(manifestations.userId, userId)))
    .limit(1);

  return row ? toManifestation(row) : null;
}

export async function listManifestations(
  db: Db,
  userId: string,
  options: { statuses?: readonly ManifestationStatus[] } = {},
): Promise<Manifestation[]> {
  const statuses = options.statuses;
  const where =
    statuses && statuses.length > 0
      ? and(eq(manifestations.userId, userId), inArray(manifestations.status, [...statuses]))
      : eq(manifestations.userId, userId);

  const rows = await db
    .select()
    .from(manifestations)
    .where(where)
    .orderBy(desc(manifestations.updatedAt));

  return rows.map(toManifestation);
}

/**
 * Autosave. Writes whatever is there — a half-written draft is never rejected — but a
 * released 顯化 is read-only, and another user's row is simply not found.
 */
export async function saveManifestationInput(
  db: Db,
  userId: string,
  id: string,
  input: Partial<ManifestationInput>,
  options: WriteOptions = {},
): Promise<RepoResult<Manifestation>> {
  const existing = await getManifestation(db, userId, id);
  if (!existing) return { ok: false, reason: 'notFound' };
  if (!canEdit(existing.status)) return { ok: false, reason: 'released' };

  const merged = normaliseInput({ ...existing, ...input });
  const [row] = await db
    .update(manifestations)
    .set({ ...inputColumns(merged), updatedAt: options.now ?? Date.now() })
    .where(and(eq(manifestations.id, id), eq(manifestations.userId, userId)))
    .returning();

  return row ? { ok: true, value: toManifestation(row) } : { ok: false, reason: 'notFound' };
}

/**
 * Finish the builder: validate the whole 顯化 and start its path. Already-active rows keep
 * their original startedAt, so editing never restarts day 1.
 */
export async function activateManifestation(
  db: Db,
  userId: string,
  id: string,
  input: Partial<ManifestationInput> = {},
  options: WriteOptions = {},
): Promise<RepoResult<Manifestation>> {
  const existing = await getManifestation(db, userId, id);
  if (!existing) return { ok: false, reason: 'notFound' };
  if (!canEdit(existing.status)) return { ok: false, reason: 'released' };

  const merged = normaliseInputForActivation({ ...existing, ...input });
  const result = validateManifestation(merged);
  if (!result.ok) return { ok: false, reason: 'invalid', issues: result.issues };

  const now = options.now ?? Date.now();
  const [row] = await db
    .update(manifestations)
    .set({
      ...inputColumns(merged),
      status: 'active',
      startedAt: existing.startedAt ?? now,
      updatedAt: now,
    })
    .where(and(eq(manifestations.id, id), eq(manifestations.userId, userId)))
    .returning();

  return row ? { ok: true, value: toManifestation(row) } : { ok: false, reason: 'notFound' };
}

/** 放下. Letting go counts as progress: the row stays, with the note and the date. */
export async function releaseManifestation(
  db: Db,
  userId: string,
  id: string,
  note = '',
  options: WriteOptions = {},
): Promise<RepoResult<Manifestation>> {
  const existing = await getManifestation(db, userId, id);
  if (!existing) return { ok: false, reason: 'notFound' };
  if (!canRelease(existing.status)) return { ok: false, reason: 'released' };

  const noteCheck = validateReleaseNote(note);
  if (!noteCheck.ok) return { ok: false, reason: 'invalid', issues: noteCheck.issues };

  const now = options.now ?? Date.now();
  const trimmed = note.trim();
  const [row] = await db
    .update(manifestations)
    .set({
      status: 'released',
      releasedAt: now,
      releaseNote: trimmed === '' ? null : trimmed,
      updatedAt: now,
    })
    .where(and(eq(manifestations.id, id), eq(manifestations.userId, userId)))
    .returning();

  return row ? { ok: true, value: toManifestation(row) } : { ok: false, reason: 'notFound' };
}

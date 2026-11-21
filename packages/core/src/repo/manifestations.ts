import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { manifestations, type Manifestation, type ManifestationStatus } from '../db/schema';
import { ManifestationNotFoundError } from './errors';
import { newId } from './ids';

export interface CreateManifestationInput {
  wish: string;
  outcome: string;
  obstacle: string;
  ifCue: string;
  thenAction: string;
  steps?: string[];
  /** 1–10, the user's own sense of how likely this is. */
  likelihood: number;
  /** Day one of the 66-day path, 'YYYY-MM-DD'. */
  startDate: string;
  status?: ManifestationStatus;
}

export async function createManifestation(
  db: Db,
  userId: string,
  input: CreateManifestationInput,
  now = new Date(),
): Promise<Manifestation> {
  const [row] = await db
    .insert(manifestations)
    .values({
      id: newId(),
      userId,
      wish: input.wish,
      outcome: input.outcome,
      obstacle: input.obstacle,
      ifCue: input.ifCue,
      thenAction: input.thenAction,
      steps: input.steps ?? [],
      likelihood: input.likelihood,
      status: input.status ?? 'active',
      startDate: input.startDate,
      createdAt: now,
    })
    .returning();
  return row as Manifestation;
}

export async function listManifestations(
  db: Db,
  userId: string,
  options: { statuses?: readonly ManifestationStatus[] } = {},
): Promise<Manifestation[]> {
  const scope = options.statuses?.length
    ? and(eq(manifestations.userId, userId), inArray(manifestations.status, [...options.statuses]))
    : eq(manifestations.userId, userId);

  return db.select().from(manifestations).where(scope).orderBy(desc(manifestations.createdAt));
}

export async function getManifestation(
  db: Db,
  userId: string,
  manifestationId: string,
): Promise<Manifestation | null> {
  const [row] = await db
    .select()
    .from(manifestations)
    .where(and(eq(manifestations.id, manifestationId), eq(manifestations.userId, userId)))
    .limit(1);
  return row ?? null;
}

/**
 * Confirms the manifestation is this user's before anything is written under
 * it. Child-row writes all go through here, so a userId can never reach
 * another user's 顯化.
 */
export async function assertOwnedManifestation(
  db: Db,
  userId: string,
  manifestationId: string,
): Promise<Manifestation> {
  const row = await getManifestation(db, userId, manifestationId);
  if (!row) throw new ManifestationNotFoundError(manifestationId);
  return row;
}

export type UpdateManifestationInput = Partial<CreateManifestationInput>;

export async function updateManifestation(
  db: Db,
  userId: string,
  manifestationId: string,
  patch: UpdateManifestationInput,
): Promise<Manifestation | null> {
  const values: Record<string, unknown> = {};
  if (patch.wish !== undefined) values.wish = patch.wish;
  if (patch.outcome !== undefined) values.outcome = patch.outcome;
  if (patch.obstacle !== undefined) values.obstacle = patch.obstacle;
  if (patch.ifCue !== undefined) values.ifCue = patch.ifCue;
  if (patch.thenAction !== undefined) values.thenAction = patch.thenAction;
  if (patch.steps !== undefined) values.steps = patch.steps;
  if (patch.likelihood !== undefined) values.likelihood = patch.likelihood;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.startDate !== undefined) values.startDate = patch.startDate;
  if (Object.keys(values).length === 0) return getManifestation(db, userId, manifestationId);

  const [row] = await db
    .update(manifestations)
    .set(values)
    .where(and(eq(manifestations.id, manifestationId), eq(manifestations.userId, userId)))
    .returning();
  return row ?? null;
}

/** 顯化 are paused, released or realised — never deleted as "failed". */
export async function setManifestationStatus(
  db: Db,
  userId: string,
  manifestationId: string,
  status: ManifestationStatus,
): Promise<Manifestation | null> {
  return updateManifestation(db, userId, manifestationId, { status });
}

/** Removes the 顯化 and, by cascade, its footprints, board and reviews. */
export async function deleteManifestation(
  db: Db,
  userId: string,
  manifestationId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(manifestations)
    .where(and(eq(manifestations.id, manifestationId), eq(manifestations.userId, userId)))
    .returning({ id: manifestations.id });
  return deleted.length > 0;
}

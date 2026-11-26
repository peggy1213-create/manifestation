import { and, asc, eq, isNull } from 'drizzle-orm';
import { newId } from '../ids';
import type { Database } from '../db/client';
import { manifestations, processSteps } from '../db/schema';
import type { ProcessStep } from '../cues';
import type { DayKey } from '../time';
import { DEFAULT_TIME_ZONE } from '../time';
import { NotFoundError } from './errors';

export interface Manifestation {
  id: string;
  userId: string;
  wish: string;
  outcome: string;
  obstacle: string;
  planIf: string;
  planThen: string;
  startedOn: DayKey;
  timeZone: string;
  archivedAt: number | null;
}

/** Returns the 顯化 only when it belongs to `userId`; otherwise null. */
export async function findManifestation(
  db: Database,
  userId: string,
  manifestationId: string,
): Promise<Manifestation | null> {
  const rows = await db
    .select()
    .from(manifestations)
    .where(and(eq(manifestations.id, manifestationId), eq(manifestations.userId, userId)))
    .limit(1);

  const row = rows[0];
  return row ? { ...row, timeZone: row.timeZone || DEFAULT_TIME_ZONE } : null;
}

export async function getManifestation(
  db: Database,
  userId: string,
  manifestationId: string,
): Promise<Manifestation> {
  const found = await findManifestation(db, userId, manifestationId);
  if (!found) throw new NotFoundError('顯化');
  return found;
}

export async function listManifestations(db: Database, userId: string): Promise<Manifestation[]> {
  const rows = await db
    .select()
    .from(manifestations)
    .where(and(eq(manifestations.userId, userId), isNull(manifestations.archivedAt)))
    .orderBy(asc(manifestations.createdAt));

  return rows.map((row) => ({ ...row, timeZone: row.timeZone || DEFAULT_TIME_ZONE }));
}

/** The 小行動 of one 顯化, scoped by user through the denormalised user_id. */
export async function listProcessSteps(
  db: Database,
  userId: string,
  manifestationId: string,
): Promise<ProcessStep[]> {
  const rows = await db
    .select()
    .from(processSteps)
    .where(and(eq(processSteps.manifestationId, manifestationId), eq(processSteps.userId, userId)))
    .orderBy(asc(processSteps.position));

  return rows.map((row) => ({
    id: row.id,
    manifestationId: row.manifestationId,
    body: row.body,
    position: row.position,
    isCue: row.isCue === 1,
  }));
}

export interface CreateManifestationInput {
  wish: string;
  outcome: string;
  obstacle: string;
  planIf: string;
  planThen: string;
  startedOn: DayKey;
  timeZone?: string;
  /** 小行動, in the order they should appear. Each one becomes a 今日行動 cue. */
  steps?: readonly { body: string; isCue?: boolean }[];
}

/** Writes one 顯化 and its 小行動, owned by `userId`. */
export async function createManifestation(
  db: Database,
  userId: string,
  input: CreateManifestationInput,
  now: number = Date.now(),
): Promise<Manifestation> {
  const row = {
    id: newId(),
    userId,
    wish: input.wish,
    outcome: input.outcome,
    obstacle: input.obstacle,
    planIf: input.planIf,
    planThen: input.planThen,
    startedOn: input.startedOn,
    timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(manifestations).values(row);

  const steps = input.steps ?? [];
  if (steps.length > 0) {
    await db.insert(processSteps).values(
      steps.map((step, index) => ({
        id: newId(),
        manifestationId: row.id,
        userId,
        body: step.body,
        position: index + 1,
        isCue: step.isCue === false ? 0 : 1,
        createdAt: now,
      })),
    );
  }

  return row;
}

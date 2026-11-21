import { and, asc, count, eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { manifestations, type ManifestationRow } from '../db/schema';
import { newId } from '../ids';

export interface ManifestationInput {
  wish: string;
  outcome: string;
  obstacle: string;
  plan: string;
  source?: 'app' | 'guest';
  /** Epoch milliseconds; a moved-in guest 顯化 keeps the date it was written. */
  createdAt?: number;
  now?: number;
}

export interface ManifestationSummary {
  id: string;
  wish: string;
  createdAt: number;
}

export async function createManifestation(
  db: Database,
  userId: string,
  input: ManifestationInput,
): Promise<ManifestationRow> {
  const now = input.now ?? Date.now();
  const [row] = await db
    .insert(manifestations)
    .values({
      id: newId(),
      userId,
      wish: input.wish,
      outcome: input.outcome,
      obstacle: input.obstacle,
      plan: input.plan,
      source: input.source ?? 'app',
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    })
    .returning();

  if (!row) throw new Error('createManifestation returned no row');
  return row;
}

export async function listManifestations(
  db: Database,
  userId: string,
): Promise<ManifestationRow[]> {
  return db
    .select()
    .from(manifestations)
    .where(eq(manifestations.userId, userId))
    .orderBy(asc(manifestations.createdAt));
}

/** Just enough of each 顯化 to decide what a guest move should do. */
export async function listManifestationSummaries(
  db: Database,
  userId: string,
): Promise<ManifestationSummary[]> {
  return db
    .select({
      id: manifestations.id,
      wish: manifestations.wish,
      createdAt: manifestations.createdAt,
    })
    .from(manifestations)
    .where(eq(manifestations.userId, userId))
    .orderBy(asc(manifestations.createdAt));
}

/** Scoped by `userId`: another account's id simply does not exist here. */
export async function findManifestation(
  db: Database,
  userId: string,
  manifestationId: string,
): Promise<ManifestationRow | null> {
  const [row] = await db
    .select()
    .from(manifestations)
    .where(and(eq(manifestations.id, manifestationId), eq(manifestations.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function countManifestations(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(manifestations)
    .where(eq(manifestations.userId, userId));
  return row?.total ?? 0;
}

export async function deleteManifestation(
  db: Database,
  userId: string,
  manifestationId: string,
): Promise<void> {
  await db
    .delete(manifestations)
    .where(and(eq(manifestations.id, manifestationId), eq(manifestations.userId, userId)));
}

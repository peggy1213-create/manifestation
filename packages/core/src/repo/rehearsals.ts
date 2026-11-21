import { and, count, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { rehearsals, type Rehearsal } from '../db/schema';
import { newId } from './ids';
import { assertOwnedManifestation } from './manifestations';

/** Opens a 3-minute guided rehearsal. Completed is set when it finishes. */
export async function startRehearsal(
  db: Db,
  userId: string,
  manifestationId: string,
  now = new Date(),
): Promise<Rehearsal> {
  await assertOwnedManifestation(db, userId, manifestationId);

  const [row] = await db
    .insert(rehearsals)
    .values({ id: newId(), manifestationId, userId, startedAt: now, completed: false })
    .returning();
  return row as Rehearsal;
}

/** Marks it done. Returns null if the rehearsal is not this user's. */
export async function completeRehearsal(
  db: Db,
  userId: string,
  rehearsalId: string,
): Promise<Rehearsal | null> {
  const [row] = await db
    .update(rehearsals)
    .set({ completed: true })
    .where(and(eq(rehearsals.id, rehearsalId), eq(rehearsals.userId, userId)))
    .returning();
  return row ?? null;
}

export async function listRehearsals(
  db: Db,
  userId: string,
  manifestationId: string,
): Promise<Rehearsal[]> {
  return db
    .select()
    .from(rehearsals)
    .where(and(eq(rehearsals.userId, userId), eq(rehearsals.manifestationId, manifestationId)))
    .orderBy(desc(rehearsals.startedAt));
}

export async function countCompletedRehearsals(
  db: Db,
  userId: string,
  manifestationId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(rehearsals)
    .where(
      and(
        eq(rehearsals.userId, userId),
        eq(rehearsals.manifestationId, manifestationId),
        eq(rehearsals.completed, true),
      ),
    );
  return row?.value ?? 0;
}

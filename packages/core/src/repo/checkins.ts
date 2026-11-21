import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { Db } from '../db/client';
import { checkins, type Checkin, type CheckinResult } from '../db/schema';
import { newId } from './ids';
import { assertOwnedManifestation } from './manifestations';
import { ownsMediaKey, parseMediaKey } from './media';

export interface RecordCheckinInput {
  manifestationId: string;
  /** 'YYYY-MM-DD' in the user's own local day. */
  date: string;
  result: CheckinResult;
  note?: string | null;
  /** R2 key under users/{userId}/{manifestationId}/. */
  photoKey?: string | null;
  cuesDone?: string[];
}

/**
 * 記下今天. One footprint per 顯化 per day: writing the same day again edits it,
 * so a user can change their mind without losing the day.
 */
export async function recordCheckin(
  db: Db,
  userId: string,
  input: RecordCheckinInput,
): Promise<Checkin> {
  await assertOwnedManifestation(db, userId, input.manifestationId);

  const photoKey = input.photoKey ?? null;
  if (photoKey !== null) {
    const parsed = parseMediaKey(photoKey);
    if (!ownsMediaKey(userId, photoKey) || parsed?.manifestationId !== input.manifestationId) {
      throw new Error('photoKey must sit under this user and this manifestation');
    }
  }

  const values = {
    result: input.result,
    note: input.note ?? null,
    photoKey,
    cuesDone: input.cuesDone ?? [],
  };

  const [row] = await db
    .insert(checkins)
    .values({
      id: newId(),
      manifestationId: input.manifestationId,
      userId,
      date: input.date,
      ...values,
    })
    .onConflictDoUpdate({
      target: [checkins.manifestationId, checkins.date],
      set: values,
      // Belt and braces: the unique row can only be rewritten by its owner.
      setWhere: eq(checkins.userId, userId),
    })
    .returning();
  return row as Checkin;
}

export async function getCheckin(
  db: Db,
  userId: string,
  checkinId: string,
): Promise<Checkin | null> {
  const [row] = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.id, checkinId), eq(checkins.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getCheckinByDate(
  db: Db,
  userId: string,
  manifestationId: string,
  date: string,
): Promise<Checkin | null> {
  const [row] = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.userId, userId),
        eq(checkins.manifestationId, manifestationId),
        eq(checkins.date, date),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** The 足跡 of one 顯化, oldest first. Missed days are simply absent. */
export async function listCheckins(
  db: Db,
  userId: string,
  manifestationId: string,
  range: { from?: string; to?: string } = {},
): Promise<Checkin[]> {
  const filters = [eq(checkins.userId, userId), eq(checkins.manifestationId, manifestationId)];
  if (range.from) filters.push(gte(checkins.date, range.from));
  if (range.to) filters.push(lte(checkins.date, range.to));

  return db
    .select()
    .from(checkins)
    .where(and(...filters))
    .orderBy(asc(checkins.date));
}

export async function deleteCheckin(db: Db, userId: string, checkinId: string): Promise<boolean> {
  const deleted = await db
    .delete(checkins)
    .where(and(eq(checkins.id, checkinId), eq(checkins.userId, userId)))
    .returning({ id: checkins.id });
  return deleted.length > 0;
}

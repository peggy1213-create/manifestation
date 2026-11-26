import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../db/client';
import { checkinCues, checkins, processSteps, rehearsals } from '../db/schema';
import { normaliseNote, type Checkin, type CheckinStatus } from '../checkin';
import { newId } from '../ids';
import { assertDayKey, type DayKey } from '../time';
import { findManifestation } from './manifestations';
import { NotFoundError } from './errors';

export interface SaveCheckinInput {
  manifestationId: string;
  dayDate: DayKey;
  status: CheckinStatus;
  note?: string | null;
  photoKey?: string | null;
  /** Ticked 今日行動 cues. Step ids not belonging to this 顯化 are dropped. */
  cueStepIds?: readonly string[];
  /** Id minted by the offline outbox, so a replayed queue entry stays one check-in. */
  clientId?: string | null;
}

export async function listCheckins(
  db: Database,
  userId: string,
  manifestationId: string,
): Promise<Checkin[]> {
  const rows = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.manifestationId, manifestationId), eq(checkins.userId, userId)));

  if (rows.length === 0) return [];

  const cueRows = await db
    .select()
    .from(checkinCues)
    .where(
      inArray(
        checkinCues.checkinId,
        rows.map((row) => row.id),
      ),
    );

  const cuesByCheckin = new Map<string, string[]>();
  for (const cue of cueRows) {
    const list = cuesByCheckin.get(cue.checkinId);
    if (list) list.push(cue.stepId);
    else cuesByCheckin.set(cue.checkinId, [cue.stepId]);
  }

  return rows
    .map((row) => ({
      id: row.id,
      manifestationId: row.manifestationId,
      dayDate: row.dayDate,
      status: row.status,
      note: row.note,
      photoKey: row.photoKey,
      cueStepIds: cuesByCheckin.get(row.id) ?? [],
      updatedAt: row.updatedAt,
    }))
    .sort((a, b) => (a.dayDate < b.dayDate ? -1 : a.dayDate > b.dayDate ? 1 : 0));
}

export async function findCheckinForDay(
  db: Database,
  userId: string,
  manifestationId: string,
  dayDate: DayKey,
): Promise<Checkin | null> {
  const all = await listCheckins(db, userId, manifestationId);
  return all.find((checkin) => checkin.dayDate === dayDate) ?? null;
}

/**
 * Records 記下今天 for one day. One check-in per day: saving the same day again
 * replaces it, which is what makes replaying the offline outbox safe.
 */
export async function saveCheckin(
  db: Database,
  userId: string,
  input: SaveCheckinInput,
  now: number = Date.now(),
): Promise<Checkin> {
  const dayDate = assertDayKey(input.dayDate);

  // Ownership is checked before anything is written, and a 顯化 belonging to
  // someone else is indistinguishable from one that does not exist.
  const manifestation = await findManifestation(db, userId, input.manifestationId);
  if (!manifestation) throw new NotFoundError('顯化');

  const note = normaliseNote(input.note);
  const photoKey = input.photoKey ?? null;

  const existing = await db
    .select({ id: checkins.id, createdAt: checkins.createdAt })
    .from(checkins)
    .where(and(eq(checkins.manifestationId, manifestation.id), eq(checkins.dayDate, dayDate)))
    .limit(1);

  const existingRow = existing[0];
  const id = existingRow?.id ?? newId();

  if (existingRow) {
    await db
      .update(checkins)
      .set({
        status: input.status,
        note,
        photoKey,
        clientId: input.clientId ?? null,
        updatedAt: now,
      })
      .where(and(eq(checkins.id, existingRow.id), eq(checkins.userId, userId)));
  } else {
    await db.insert(checkins).values({
      id,
      manifestationId: manifestation.id,
      userId,
      dayDate,
      status: input.status,
      note,
      photoKey,
      clientId: input.clientId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const cueStepIds = await ownedStepIds(db, userId, manifestation.id, input.cueStepIds ?? []);

  await db.delete(checkinCues).where(eq(checkinCues.checkinId, id));
  if (cueStepIds.length > 0) {
    await db.insert(checkinCues).values(cueStepIds.map((stepId) => ({ checkinId: id, stepId })));
  }

  return {
    id,
    manifestationId: manifestation.id,
    dayDate,
    status: input.status,
    note,
    photoKey,
    cueStepIds,
    updatedAt: now,
  };
}

/** Keeps only step ids that really belong to this user's 顯化. */
async function ownedStepIds(
  db: Database,
  userId: string,
  manifestationId: string,
  candidates: readonly string[],
): Promise<string[]> {
  const unique = [...new Set(candidates)];
  if (unique.length === 0) return [];

  const rows = await db
    .select({ id: processSteps.id })
    .from(processSteps)
    .where(
      and(
        eq(processSteps.manifestationId, manifestationId),
        eq(processSteps.userId, userId),
        inArray(processSteps.id, unique),
      ),
    );

  return rows.map((row) => row.id);
}

/** Days with a completed 預演, for the rehearsal count in the cycle stats. */
export async function listCompletedRehearsalDays(
  db: Database,
  userId: string,
  manifestationId: string,
): Promise<DayKey[]> {
  const rows = await db
    .select({ dayDate: rehearsals.dayDate })
    .from(rehearsals)
    .where(
      and(
        eq(rehearsals.manifestationId, manifestationId),
        eq(rehearsals.userId, userId),
        eq(rehearsals.completed, 1),
      ),
    );

  return rows.map((row) => row.dayDate);
}

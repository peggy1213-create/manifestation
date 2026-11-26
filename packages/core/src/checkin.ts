/**
 * 記下今天 (the daily check-in) and the rule that turns ticked 今日行動 cues into a
 * status. Missed days are a neutral fact here: nothing in this module ranks,
 * scores or warns.
 */

import type { DayKey } from './time';

export const CHECKIN_STATUSES = ['done', 'partial', 'missed'] as const;

/** 'done' = 做到了, 'partial' = 部分, 'missed' = 今天沒做到. */
export type CheckinStatus = (typeof CHECKIN_STATUSES)[number];

export const NOTE_MAX_LENGTH = 280;

export interface Checkin {
  id: string;
  manifestationId: string;
  dayDate: DayKey;
  status: CheckinStatus;
  note: string | null;
  photoKey: string | null;
  cueStepIds: string[];
  updatedAt: number;
}

export function isCheckinStatus(value: unknown): value is CheckinStatus {
  return typeof value === 'string' && (CHECKIN_STATUSES as readonly string[]).includes(value);
}

/** Done and partial both count as having acted; a missed day never does. */
export function hasActed(status: CheckinStatus): boolean {
  return status === 'done' || status === 'partial';
}

/**
 * The cue rule: ticking every 今日行動 cue is 做到了, ticking some is 部分, ticking
 * none is 今天沒做到. With no cues on screen there is nothing to infer from, so the
 * person chooses the status themselves and this returns null.
 */
export function statusFromCues(input: {
  totalCues: number;
  tickedCues: number;
}): CheckinStatus | null {
  const total = Math.trunc(input.totalCues);
  const ticked = Math.trunc(input.tickedCues);
  if (total <= 0) return null;
  if (ticked < 0 || ticked > total) {
    throw new RangeError(`tickedCues ${ticked} is outside 0..${total}`);
  }
  if (ticked === 0) return 'missed';
  if (ticked === total) return 'done';
  return 'partial';
}

/** Trims a one-line note and collapses newlines; empty becomes null. */
export function normaliseNote(note: string | null | undefined): string | null {
  if (typeof note !== 'string') return null;
  const collapsed = note.replace(/\s+/gu, ' ').trim();
  if (collapsed.length === 0) return null;
  return collapsed.slice(0, NOTE_MAX_LENGTH);
}

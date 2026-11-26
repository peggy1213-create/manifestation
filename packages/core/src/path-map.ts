/**
 * 足跡 (the path map): 66 cells, one per day of the path. A day with no check-in
 * in the past is simply a day with no footprint — the UI paints it neutral grey.
 * No cell carries a judgement, and nothing here distinguishes "missed" from
 * "not yet recorded" by severity.
 */

import type { Checkin, CheckinStatus } from './checkin';
import { CYCLE_DAYS } from './cycle';
import { addDays, compareDayKeys, type DayKey } from './time';

export interface PathCell {
  dayNumber: number;
  dayDate: DayKey;
  /** null when the day has no check-in: either still to come, or left blank. */
  status: CheckinStatus | null;
  isToday: boolean;
  /** True for days that have not started yet. */
  isFuture: boolean;
  hasNote: boolean;
  hasPhoto: boolean;
}

export interface PathMapInput {
  startedOn: DayKey;
  today: DayKey;
  checkins: readonly Pick<Checkin, 'dayDate' | 'status' | 'note' | 'photoKey'>[];
}

export function buildPathMap(input: PathMapInput): PathCell[] {
  const byDay = new Map(input.checkins.map((checkin) => [checkin.dayDate, checkin]));

  return Array.from({ length: CYCLE_DAYS }, (_, index) => {
    const dayDate = addDays(input.startedOn, index);
    const checkin = byDay.get(dayDate);
    return {
      dayNumber: index + 1,
      dayDate,
      status: checkin?.status ?? null,
      isToday: dayDate === input.today,
      isFuture: compareDayKeys(dayDate, input.today) > 0,
      hasNote: Boolean(checkin?.note),
      hasPhoto: Boolean(checkin?.photoKey),
    };
  });
}

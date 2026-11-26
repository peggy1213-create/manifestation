/**
 * Cycle stats. Every number here is descriptive: how many days this person
 * showed up, how recently, how often they followed through. None of them is a
 * target, and a blank day lowers nothing retroactively — today only enters the
 * follow-through denominator once it has been recorded, so an unopened today
 * never reads as a drop.
 */

import { hasActed, type Checkin } from './checkin';
import { CYCLE_DAYS, elapsedDays, isWithinCycle } from './cycle';
import { compareDayKeys, previousDay, type DayKey } from './time';

/** One blank day is forgiven inside a gentle streak; two in a row end it. */
export const STREAK_GRACE_DAYS = 1;

export interface CycleStatsInput {
  startedOn: DayKey;
  today: DayKey;
  checkins: readonly Pick<Checkin, 'dayDate' | 'status'>[];
  /** Completed 預演 sessions, one entry per rehearsal. */
  rehearsalDays?: readonly DayKey[];
}

export interface CycleStats {
  /** Days of the 66-day path that have begun, counting today. */
  elapsedDays: number;
  cycleDays: number;
  /** Days in this cycle recorded as 做到了 or 部分. */
  daysActed: number;
  /** Days recorded as 做到了. */
  daysFull: number;
  /** Days recorded as 部分. */
  daysPartial: number;
  /**
   * Consecutive recent days with action, forgiving a single blank day.
   * Today being still blank never breaks it.
   */
  gentleStreak: number;
  /**
   * daysActed over the days that have been recorded or have passed, as 0..100.
   * null until there is at least one closed day to divide by.
   */
  followThroughPercent: number | null;
  rehearsals: number;
}

function actedDaySet(
  startedOn: DayKey,
  checkins: readonly Pick<Checkin, 'dayDate' | 'status'>[],
): Set<DayKey> {
  const acted = new Set<DayKey>();
  for (const checkin of checkins) {
    if (isWithinCycle(startedOn, checkin.dayDate) && hasActed(checkin.status)) {
      acted.add(checkin.dayDate);
    }
  }
  return acted;
}

export function gentleStreak(input: {
  startedOn: DayKey;
  today: DayKey;
  checkins: readonly Pick<Checkin, 'dayDate' | 'status'>[];
}): number {
  const acted = actedDaySet(input.startedOn, input.checkins);
  if (acted.size === 0) return 0;

  // Today is still open: if nothing is recorded yet, start from yesterday
  // rather than treating an unfinished day as a blank one.
  let cursor = acted.has(input.today) ? input.today : previousDay(input.today);
  let streak = 0;
  let forgiven = 0;

  while (compareDayKeys(cursor, input.startedOn) >= 0) {
    if (acted.has(cursor)) {
      streak += 1;
      forgiven = 0;
    } else {
      if (forgiven >= STREAK_GRACE_DAYS) break;
      forgiven += 1;
    }
    cursor = previousDay(cursor);
  }

  return streak;
}

export function cycleStats(input: CycleStatsInput): CycleStats {
  const inCycle = input.checkins.filter((checkin) =>
    isWithinCycle(input.startedOn, checkin.dayDate),
  );
  const daysFull = inCycle.filter((checkin) => checkin.status === 'done').length;
  const daysPartial = inCycle.filter((checkin) => checkin.status === 'partial').length;
  const daysActed = daysFull + daysPartial;

  const elapsed = elapsedDays(input.startedOn, input.today);
  const recordedToday = inCycle.some((checkin) => checkin.dayDate === input.today);
  const closedDays = recordedToday ? elapsed : elapsed - 1;

  const rehearsals = (input.rehearsalDays ?? []).filter((day) =>
    isWithinCycle(input.startedOn, day),
  ).length;

  return {
    elapsedDays: elapsed,
    cycleDays: CYCLE_DAYS,
    daysActed,
    daysFull,
    daysPartial,
    gentleStreak: gentleStreak(input),
    followThroughPercent:
      closedDays > 0 ? Math.round((Math.min(daysActed, closedDays) / closedDays) * 100) : null,
    rehearsals,
  };
}

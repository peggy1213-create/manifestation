/**
 * The 66-day path. 66 days is the median time a new daily habit took to feel
 * automatic in Lally et al. (2010) — a length, not a deadline. Nothing here
 * counts down or expires: day 67 onwards simply sits past the end of the path.
 */

import { addDays, compareDayKeys, daysBetween, type DayKey } from './time';

export const CYCLE_DAYS = 66;

/** 1-based day of the path. Day 1 is the day the 顯化 started. */
export function dayNumber(startedOn: DayKey, day: DayKey): number {
  return daysBetween(startedOn, day) + 1;
}

export function cycleLastDay(startedOn: DayKey): DayKey {
  return addDays(startedOn, CYCLE_DAYS - 1);
}

export function isWithinCycle(startedOn: DayKey, day: DayKey): boolean {
  const number = dayNumber(startedOn, day);
  return number >= 1 && number <= CYCLE_DAYS;
}

/** Days of the path that have begun, counting today. Clamped to 1..66. */
export function elapsedDays(startedOn: DayKey, today: DayKey): number {
  if (compareDayKeys(today, startedOn) < 0) return 0;
  return Math.min(CYCLE_DAYS, dayNumber(startedOn, today));
}

/** Days of the path still ahead, not counting today. Never negative. */
export function remainingDays(startedOn: DayKey, today: DayKey): number {
  return CYCLE_DAYS - elapsedDays(startedOn, today);
}

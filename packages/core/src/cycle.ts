// The 66-day path (66 天足跡路徑): where a day sits in a cycle, and what its stone looks like.
//
// 66 days is the length Clear Path uses for one pass of a 顯化. When a pass ends the path starts
// again at day 1, so a long-running 顯化 is a sequence of cycles rather than an ever-growing line.

import {
  type LocalDate,
  addDays,
  compareLocalDates,
  daysBetween,
  isLocalDate,
  todayIn,
  DEFAULT_TIME_ZONE,
} from './dates';

/** One pass of the path. */
export const CYCLE_LENGTH = 66;

/** How a day was recorded. Kind tracking: there is no 'failed' quality. */
export type FootprintQuality = 'did' | 'partly';

/** A footprint (足跡) the user recorded for one calendar day. */
export interface Footprint {
  date: LocalDate;
  quality: FootprintQuality;
}

/**
 * How one dot on the path is drawn.
 *
 * - `did`     the day was recorded in full
 * - `partly`  a smaller step was recorded
 * - `missed`  the day closed with nothing recorded — neutral, never shamed
 * - `future`  the day has not arrived
 * - `today`   today, still open, nothing recorded yet
 *
 * `today` only wins while today has no footprint. Once today is recorded it becomes `did` or
 * `partly` like any other day, and `PathStone.isToday` is what the view uses to ring it.
 */
export type StoneState = 'did' | 'partly' | 'missed' | 'future' | 'today';

export interface CyclePosition {
  /** 1-based cycle number. */
  cycle: number;
  /** 1-66 within that cycle. */
  dayInCycle: number;
  /** 1-based day count since the path started, across all cycles. */
  dayIndex: number;
}

export interface CycleBounds {
  cycle: number;
  start: LocalDate;
  end: LocalDate;
}

export interface PathStone {
  /** 1-66. */
  dayInCycle: number;
  /** 1-based day count since the path started. */
  dayIndex: number;
  date: LocalDate;
  state: StoneState;
  /** True for exactly one stone when today falls inside this cycle. */
  isToday: boolean;
  /** The recorded quality, if any — set even when `isToday`. */
  quality: FootprintQuality | null;
}

function assertCycleLength(cycleLength: number): number {
  if (!Number.isInteger(cycleLength) || cycleLength < 1) {
    throw new RangeError(`cycleLength must be a positive whole number, received ${cycleLength}`);
  }
  return cycleLength;
}

/**
 * 1-based day count since `startDate`. Day 1 is the start date itself.
 * Returns 0 or a negative number for days before the path began.
 */
export function dayIndex(startDate: LocalDate, onDate: LocalDate): number {
  return daysBetween(startDate, onDate) + 1;
}

/** Where `onDate` sits in the cycles that began on `startDate`, or null if the path has not begun. */
export function cyclePosition(
  startDate: LocalDate,
  onDate: LocalDate,
  cycleLength: number = CYCLE_LENGTH,
): CyclePosition | null {
  assertCycleLength(cycleLength);
  const index = dayIndex(startDate, onDate);
  if (index < 1) return null;
  return {
    cycle: Math.floor((index - 1) / cycleLength) + 1,
    dayInCycle: ((index - 1) % cycleLength) + 1,
    dayIndex: index,
  };
}

/** The first and last calendar day of a given cycle. */
export function cycleBounds(
  startDate: LocalDate,
  cycle: number,
  cycleLength: number = CYCLE_LENGTH,
): CycleBounds {
  assertCycleLength(cycleLength);
  if (!Number.isInteger(cycle) || cycle < 1) {
    throw new RangeError(`cycle must be a positive whole number, received ${cycle}`);
  }
  const offset = (cycle - 1) * cycleLength;
  return {
    cycle,
    start: addDays(startDate, offset),
    end: addDays(startDate, offset + cycleLength - 1),
  };
}

/** The calendar day of a given day in a given cycle. */
export function dateOfDay(
  startDate: LocalDate,
  cycle: number,
  dayInCycle: number,
  cycleLength: number = CYCLE_LENGTH,
): LocalDate {
  assertCycleLength(cycleLength);
  if (!Number.isInteger(dayInCycle) || dayInCycle < 1 || dayInCycle > cycleLength) {
    throw new RangeError(`dayInCycle must be between 1 and ${cycleLength}, received ${dayInCycle}`);
  }
  return addDays(cycleBounds(startDate, cycle, cycleLength).start, dayInCycle - 1);
}

/** The state of one dot, given the day, today, and whatever was recorded for that day. */
export function stoneState(
  day: LocalDate,
  today: LocalDate,
  quality: FootprintQuality | null = null,
): StoneState {
  const order = compareLocalDates(day, today);
  if (order > 0) return 'future';
  if (quality) return quality;
  // Today is still open, so it is neither missed nor recorded.
  return order === 0 ? 'today' : 'missed';
}

/**
 * Collapse footprints to one quality per day.
 * If a day somehow carries both, the kinder record wins.
 */
export function footprintsByDate(footprints: readonly Footprint[]): Map<LocalDate, FootprintQuality> {
  const byDate = new Map<LocalDate, FootprintQuality>();
  for (const footprint of footprints) {
    if (!isLocalDate(footprint.date)) {
      throw new RangeError(`footprint date must be 'YYYY-MM-DD', received ${String(footprint.date)}`);
    }
    if (footprint.quality !== 'did' && footprint.quality !== 'partly') {
      throw new RangeError(`footprint quality must be 'did' or 'partly', received ${String(footprint.quality)}`);
    }
    if (byDate.get(footprint.date) === 'did') continue;
    byDate.set(footprint.date, footprint.quality);
  }
  return byDate;
}

export interface BuildPathOptions {
  /** Day 1 of cycle 1. */
  startDate: LocalDate;
  /** Everything recorded so far; days outside the cycle are ignored. */
  footprints?: readonly Footprint[];
  /** Today, as a calendar day. Defaults to today in `timeZone`. */
  today?: LocalDate;
  /** Used only to work out `today` when it is not given. */
  timeZone?: string;
  /** Which cycle to draw. Defaults to the cycle today falls in, or cycle 1 before the start. */
  cycle?: number;
  cycleLength?: number;
}

export interface Path {
  cycle: number;
  cycleLength: number;
  startDate: LocalDate;
  today: LocalDate;
  bounds: CycleBounds;
  /** One stone per day of the cycle, day 1 first. */
  stones: PathStone[];
  /** Where today sits, or null when today is outside this cycle. */
  position: CyclePosition | null;
}

/** Build one cycle of the path: `cycleLength` stones, each already in its drawing state. */
export function buildPath(options: BuildPathOptions): Path {
  const cycleLength = assertCycleLength(options.cycleLength ?? CYCLE_LENGTH);
  const { startDate } = options;
  const today = options.today ?? todayIn(options.timeZone ?? DEFAULT_TIME_ZONE);
  const todayPosition = cyclePosition(startDate, today, cycleLength);
  const cycle = options.cycle ?? todayPosition?.cycle ?? 1;
  const bounds = cycleBounds(startDate, cycle, cycleLength);
  const byDate = footprintsByDate(options.footprints ?? []);

  const stones: PathStone[] = [];
  for (let dayInCycle = 1; dayInCycle <= cycleLength; dayInCycle += 1) {
    const date = addDays(bounds.start, dayInCycle - 1);
    const quality = byDate.get(date) ?? null;
    stones.push({
      dayInCycle,
      dayIndex: (cycle - 1) * cycleLength + dayInCycle,
      date,
      state: stoneState(date, today, quality),
      isToday: date === today,
      quality,
    });
  }

  return {
    cycle,
    cycleLength,
    startDate,
    today,
    bounds,
    stones,
    position: todayPosition?.cycle === cycle ? todayPosition : null,
  };
}

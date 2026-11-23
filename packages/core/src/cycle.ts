// The 66-day path (66 天足跡). Pure domain logic: no React, no framework imports.
//
// Kind tracking (CLAUDE.md): a day without a footprint is simply "not recorded".
// It is neutral — never a failure, never a broken streak to shame.

/** A path is 66 days long (Lally et al., 2010: habit formation took a median of 66 days). */
export const CYCLE_LENGTH_DAYS = 66;

/** How a single day on the path is drawn. */
export type DayState =
  /** A footprint was recorded that day. */
  | 'recorded'
  /** The day has passed with no footprint. Neutral grey, no shaming. */
  | 'not-recorded'
  /** Today — still open. */
  | 'today'
  /** Still ahead. */
  | 'ahead';

export interface PathDay {
  /** 1-based day number within the cycle. */
  readonly day: number;
  readonly state: DayState;
}

export interface BuildPathInput {
  /** 1-based day the person is on, from 1 to `length`. */
  readonly currentDay: number;
  /** Day numbers with a recorded footprint. Duplicates and today are fine. */
  readonly recordedDays: readonly number[];
  /** Defaults to {@link CYCLE_LENGTH_DAYS}. */
  readonly length?: number;
}

/**
 * Lays out one cycle as a list of days with their state.
 * Throws on input that cannot describe a real path, so callers fail loudly in tests
 * rather than rendering a wrong path.
 */
export function buildPath({
  currentDay,
  recordedDays,
  length = CYCLE_LENGTH_DAYS,
}: BuildPathInput): PathDay[] {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError(`length must be a positive integer, got ${length}`);
  }
  if (!Number.isInteger(currentDay) || currentDay < 1 || currentDay > length) {
    throw new RangeError(`currentDay must be between 1 and ${length}, got ${currentDay}`);
  }

  const recorded = new Set(recordedDays);
  for (const day of recorded) {
    if (!Number.isInteger(day) || day < 1 || day > length) {
      throw new RangeError(`recorded day must be between 1 and ${length}, got ${day}`);
    }
  }

  return Array.from({ length }, (_unused, index): PathDay => {
    const day = index + 1;
    if (recorded.has(day)) return { day, state: 'recorded' };
    if (day === currentDay) return { day, state: 'today' };
    return { day, state: day < currentDay ? 'not-recorded' : 'ahead' };
  });
}

/** How many footprints are on the path so far. */
export function countRecorded(days: readonly PathDay[]): number {
  return days.filter((day) => day.state === 'recorded').length;
}

/**
 * Days still ahead, including today when it has no footprint yet.
 * Deliberately not a countdown in copy — it is only used to describe the path, kindly.
 */
export function countAhead(days: readonly PathDay[]): number {
  return days.filter((day) => day.state === 'ahead' || day.state === 'today').length;
}

/** Sample path used by the marketing preview on `/`. Not a real person's data. */
export const SAMPLE_PATH: BuildPathInput = {
  currentDay: 24,
  recordedDays: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 22, 23],
};

/** The sample path laid out, for a server-rendered preview. */
export function samplePath(): PathDay[] {
  return buildPath(SAMPLE_PATH);
}

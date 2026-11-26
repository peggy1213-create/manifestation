// Streak and follow-through numbers for one cycle of the path.
//
// Kind tracking shapes every rule here:
// - Today counts only once it has been recorded. An unrecorded today is still open, so it never
//   breaks a streak and never drags the follow-through number down.
// - `partly` counts as a footprint. A smaller step is still a step.
// - A missed day is simply not counted. Nothing is ever expressed as a loss or a failure.

import type { PathStone } from './cycle';

export interface PathStats {
  /** Days of this cycle that have begun, including today. 0 before the cycle starts. */
  elapsedDays: number;
  /** Days of this cycle still ahead, not counting today. */
  remainingDays: number;
  /** Days that have closed, plus today if today was recorded — the days there is something to say about. */
  closedDays: number;
  didDays: number;
  partlyDays: number;
  /** Days that closed with nothing recorded. */
  missedDays: number;
  /** did + partly. */
  recordedDays: number;
  /** Consecutive recorded days ending at today, or at yesterday while today is still open. */
  currentStreak: number;
  /** The longest run of recorded days in this cycle. */
  longestStreak: number;
  /**
   * recordedDays / closedDays, 0-1, or null when no day has closed yet — there is nothing to
   * report on day 1, and showing 0% would read as a verdict.
   */
  followThrough: number | null;
  /** `followThrough` as a whole percentage, or null. */
  followThroughPercent: number | null;
  /** True once today has a footprint. */
  recordedToday: boolean;
}

function isRecorded(stone: PathStone): boolean {
  return stone.state === 'did' || stone.state === 'partly';
}

/**
 * A day has closed when there is something to say about it: it is past, or it is today and
 * already recorded. `state === 'today'` means today with nothing recorded yet, and `'future'`
 * means not yet arrived; neither closes.
 */
function hasClosed(stone: PathStone): boolean {
  return stone.state === 'did' || stone.state === 'partly' || stone.state === 'missed';
}

/** Streak and follow-through numbers for a cycle built by `buildPath`. */
export function pathStats(stones: readonly PathStone[]): PathStats {
  let didDays = 0;
  let partlyDays = 0;
  let missedDays = 0;
  let elapsedDays = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  let recordedToday = false;
  let run = 0;

  for (const stone of stones) {
    if (stone.state !== 'future') elapsedDays += 1;
    if (stone.isToday && isRecorded(stone)) recordedToday = true;

    if (stone.state === 'did') didDays += 1;
    else if (stone.state === 'partly') partlyDays += 1;
    else if (stone.state === 'missed') missedDays += 1;

    if (!hasClosed(stone)) continue;

    if (isRecorded(stone)) {
      run += 1;
      if (run > longestStreak) longestStreak = run;
      // The last closed day of the cycle carries the streak the user is standing on.
      currentStreak = run;
    } else {
      run = 0;
      currentStreak = 0;
    }
  }

  const recordedDays = didDays + partlyDays;
  const closedDays = recordedDays + missedDays;
  const followThrough = closedDays > 0 ? recordedDays / closedDays : null;

  return {
    elapsedDays,
    remainingDays: stones.length - elapsedDays,
    closedDays,
    didDays,
    partlyDays,
    missedDays,
    recordedDays,
    currentStreak,
    longestStreak,
    followThrough,
    followThroughPercent: followThrough === null ? null : Math.round(followThrough * 100),
    recordedToday,
  };
}

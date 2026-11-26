import { describe, expect, it } from 'vitest';
import { buildPath, dateOfDay, type Footprint, type FootprintQuality } from './cycle';
import { pathStats } from './stats';

const START = '2026-03-01';

function footprints(entries: Record<number, FootprintQuality>): Footprint[] {
  return Object.entries(entries).map(([day, quality]) => ({
    date: dateOfDay(START, 1, Number(day)),
    quality,
  }));
}

/** Stats for cycle 1, so a `today` past the end of the cycle still reports on the cycle drawn. */
function statsFor(today: string, entries: Record<number, FootprintQuality> = {}) {
  return pathStats(
    buildPath({ startDate: START, today, cycle: 1, footprints: footprints(entries) }).stones,
  );
}

describe('pathStats', () => {
  it('counts nothing before the path begins, and reports no follow-through yet', () => {
    const stats = statsFor('2026-02-20');
    expect(stats.elapsedDays).toBe(0);
    expect(stats.remainingDays).toBe(66);
    expect(stats.closedDays).toBe(0);
    expect(stats.followThrough).toBeNull();
    expect(stats.followThroughPercent).toBeNull();
  });

  it('reports no follow-through on day 1 while today is still open', () => {
    const stats = statsFor('2026-03-01');
    expect(stats.elapsedDays).toBe(1);
    expect(stats.remainingDays).toBe(65);
    expect(stats.closedDays).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.followThrough).toBeNull();
    expect(stats.recordedToday).toBe(false);
  });

  it('counts a recorded today', () => {
    const stats = statsFor('2026-03-01', { 1: 'did' });
    expect(stats.recordedToday).toBe(true);
    expect(stats.didDays).toBe(1);
    expect(stats.closedDays).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.followThroughPercent).toBe(100);
  });

  it('counts did, partly and missed days separately', () => {
    const stats = statsFor('2026-03-06', { 1: 'did', 2: 'partly', 3: 'did', 5: 'partly' });
    // Day 4 was missed; day 6 is today and still open.
    expect(stats.didDays).toBe(2);
    expect(stats.partlyDays).toBe(2);
    expect(stats.missedDays).toBe(1);
    expect(stats.recordedDays).toBe(4);
    expect(stats.elapsedDays).toBe(6);
    expect(stats.closedDays).toBe(5);
    expect(stats.followThrough).toBeCloseTo(4 / 5);
    expect(stats.followThroughPercent).toBe(80);
  });

  it('counts a partly day towards the streak', () => {
    const stats = statsFor('2026-03-05', { 1: 'did', 2: 'partly', 3: 'did', 4: 'partly' });
    expect(stats.currentStreak).toBe(4);
    expect(stats.longestStreak).toBe(4);
  });

  it('leaves the streak alone while today is still open', () => {
    // Days 1-4 recorded, day 5 is today with nothing recorded yet.
    const stats = statsFor('2026-03-05', { 1: 'did', 2: 'did', 3: 'did', 4: 'did' });
    expect(stats.currentStreak).toBe(4);
    expect(stats.recordedToday).toBe(false);
  });

  it('breaks the streak on a missed day but keeps the longest run', () => {
    // Days 1-3 recorded, day 4 missed, days 5-6 recorded, day 7 is today.
    const stats = statsFor('2026-03-07', { 1: 'did', 2: 'did', 3: 'did', 5: 'did', 6: 'did' });
    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(3);
    expect(stats.missedDays).toBe(1);
  });

  it('reports a zero streak when yesterday was missed, without touching the longest run', () => {
    // Days 1-3 recorded, day 4 missed, day 5 is today and still open.
    const stats = statsFor('2026-03-05', { 1: 'did', 2: 'did', 3: 'did' });
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(3);
  });

  it('picks the streak back up the moment today is recorded', () => {
    const stats = statsFor('2026-03-05', { 1: 'did', 2: 'did', 3: 'did', 5: 'partly' });
    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(3);
    expect(stats.recordedToday).toBe(true);
  });

  it('does not count days still ahead', () => {
    const stats = statsFor('2026-03-03', { 1: 'did', 2: 'did' });
    expect(stats.elapsedDays).toBe(3);
    expect(stats.remainingDays).toBe(63);
    expect(stats.closedDays).toBe(2);
    expect(stats.followThroughPercent).toBe(100);
  });

  it('reports a finished cycle in full', () => {
    const stats = statsFor('2026-06-01', { 1: 'did', 2: 'partly' });
    expect(stats.elapsedDays).toBe(66);
    expect(stats.remainingDays).toBe(0);
    expect(stats.closedDays).toBe(66);
    expect(stats.missedDays).toBe(64);
    expect(stats.followThroughPercent).toBe(3);
  });

  it('rounds follow-through to a whole percentage', () => {
    // 2 of 3 closed days recorded.
    const stats = statsFor('2026-03-04', { 1: 'did', 3: 'did' });
    expect(stats.followThrough).toBeCloseTo(2 / 3);
    expect(stats.followThroughPercent).toBe(67);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CYCLE_DAYS,
  cycleLastDay,
  dayNumber,
  elapsedDays,
  isWithinCycle,
  remainingDays,
} from './cycle';

describe('the 66-day path', () => {
  const startedOn = '2026-01-01';

  it('is 66 days long, counted from day 1', () => {
    expect(CYCLE_DAYS).toBe(66);
    expect(dayNumber(startedOn, '2026-01-01')).toBe(1);
    expect(dayNumber(startedOn, '2026-01-02')).toBe(2);
    expect(cycleLastDay(startedOn)).toBe('2026-03-07');
    expect(dayNumber(startedOn, '2026-03-07')).toBe(66);
  });

  it('knows which days belong to the path', () => {
    expect(isWithinCycle(startedOn, '2026-01-01')).toBe(true);
    expect(isWithinCycle(startedOn, '2026-03-07')).toBe(true);
    expect(isWithinCycle(startedOn, '2026-03-08')).toBe(false);
    expect(isWithinCycle(startedOn, '2025-12-31')).toBe(false);
  });

  it('counts elapsed days inclusively and never past 66', () => {
    expect(elapsedDays(startedOn, '2025-12-31')).toBe(0);
    expect(elapsedDays(startedOn, '2026-01-01')).toBe(1);
    expect(elapsedDays(startedOn, '2026-03-07')).toBe(66);
    expect(elapsedDays(startedOn, '2026-06-01')).toBe(66);
  });

  it('never reports negative days remaining', () => {
    expect(remainingDays(startedOn, '2026-01-01')).toBe(65);
    expect(remainingDays(startedOn, '2026-03-07')).toBe(0);
    expect(remainingDays(startedOn, '2026-06-01')).toBe(0);
  });
});

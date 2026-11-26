import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIME_ZONE,
  addDays,
  compareLocalDates,
  daysBetween,
  isLocalDate,
  parseLocalDate,
  toLocalDate,
  todayIn,
} from './dates';

describe('isLocalDate', () => {
  it('accepts a real calendar day', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2028-02-29')).toBe(true);
  });

  it('rejects days that do not exist or are badly shaped', () => {
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('2026-1-1')).toBe(false);
    expect(isLocalDate('2026-02-28T00:00:00Z')).toBe(false);
    expect(isLocalDate(20260228)).toBe(false);
    expect(isLocalDate(undefined)).toBe(false);
  });
});

describe('toLocalDate', () => {
  it('defaults to Taipei', () => {
    expect(DEFAULT_TIME_ZONE).toBe('Asia/Taipei');
    expect(toLocalDate(new Date('2026-03-02T04:00:00Z'))).toBe('2026-03-02');
  });

  it('rolls over to the next day in Taipei while UTC is still on the day before', () => {
    // 00:30 on 3 March in Taipei (UTC+8) is 16:30 on 2 March in UTC.
    const instant = new Date('2026-03-02T16:30:00Z');
    expect(toLocalDate(instant, 'Asia/Taipei')).toBe('2026-03-03');
    expect(toLocalDate(instant, 'UTC')).toBe('2026-03-02');
  });

  it('stays on the day before in Taipei while UTC has moved on', () => {
    // 07:00 on 2 March in Taipei is 23:00 on 1 March in UTC.
    const instant = new Date('2026-03-01T23:00:00Z');
    expect(toLocalDate(instant, 'Asia/Taipei')).toBe('2026-03-02');
    expect(toLocalDate(instant, 'UTC')).toBe('2026-03-01');
  });

  it('reads the same instant differently in a zone behind UTC', () => {
    const instant = new Date('2026-03-02T03:00:00Z');
    expect(toLocalDate(instant, 'Asia/Taipei')).toBe('2026-03-02');
    expect(toLocalDate(instant, 'America/Los_Angeles')).toBe('2026-03-01');
  });

  it('is exact at the first and last minute of a Taipei day', () => {
    // 00:00:00 Taipei on 1 January 2026.
    expect(toLocalDate(new Date('2025-12-31T16:00:00Z'), 'Asia/Taipei')).toBe('2026-01-01');
    // 23:59:59 Taipei on 1 January 2026.
    expect(toLocalDate(new Date('2026-01-01T15:59:59Z'), 'Asia/Taipei')).toBe('2026-01-01');
    // One second later it is the 2nd.
    expect(toLocalDate(new Date('2026-01-01T16:00:00Z'), 'Asia/Taipei')).toBe('2026-01-02');
  });

  it('throws on an invalid Date', () => {
    expect(() => toLocalDate(new Date('nonsense'))).toThrow(RangeError);
  });
});

describe('todayIn', () => {
  it('reads the given instant in the given zone', () => {
    const now = new Date('2026-03-02T16:30:00Z');
    expect(todayIn('Asia/Taipei', now)).toBe('2026-03-03');
    expect(todayIn('UTC', now)).toBe('2026-03-02');
  });
});

describe('addDays and daysBetween', () => {
  it('moves across month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('is unaffected by daylight saving, because it is calendar arithmetic', () => {
    // 8 March 2026 is the US spring-forward date; a 23-hour day must still be one day.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    // 1 November 2026 is the US fall-back date; a 25-hour day is also one day.
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
    expect(daysBetween('2026-03-01', '2026-05-05')).toBe(65);
    expect(daysBetween('2026-05-05', '2026-03-01')).toBe(-65);
  });

  it('round-trips with addDays over a 66-day cycle', () => {
    expect(addDays('2026-03-01', 65)).toBe('2026-05-05');
    expect(daysBetween('2026-03-01', addDays('2026-03-01', 65))).toBe(65);
  });

  it('rejects fractional days and bad dates', () => {
    expect(() => addDays('2026-03-01', 1.5)).toThrow(RangeError);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
    expect(() => daysBetween('2026-03-01', 'tomorrow')).toThrow(RangeError);
  });
});

describe('parseLocalDate and compareLocalDates', () => {
  it('splits a day into numbers', () => {
    expect(parseLocalDate('2026-03-09')).toEqual({ year: 2026, month: 3, day: 9 });
  });

  it('orders days chronologically', () => {
    expect(compareLocalDates('2026-03-01', '2026-03-02')).toBe(-1);
    expect(compareLocalDates('2026-03-02', '2026-03-01')).toBe(1);
    expect(compareLocalDates('2026-03-01', '2026-03-01')).toBe(0);
  });
});

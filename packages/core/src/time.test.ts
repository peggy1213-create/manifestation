import { describe, expect, it } from 'vitest';
import { addDays, dayKey, daysBetween, dayKeyRange, isDayKey, previousDay, today } from './time';

describe('day keys', () => {
  it('resolves the calendar day in Taipei, not UTC', () => {
    // 2026-03-01T15:30Z is already 2026-03-01 23:30 in Taipei.
    expect(dayKey(new Date('2026-03-01T15:30:00Z'))).toBe('2026-03-01');
    // 2026-03-01T16:30Z has rolled over into the 2nd in Taipei but not in UTC.
    expect(dayKey(new Date('2026-03-01T16:30:00Z'))).toBe('2026-03-02');
    expect(dayKey(new Date('2026-03-01T16:30:00Z'), 'UTC')).toBe('2026-03-01');
  });

  it('reads today in the given time zone', () => {
    expect(today('Asia/Taipei', new Date('2026-11-26T20:00:00Z'))).toBe('2026-11-27');
  });

  it('accepts real dates and rejects impossible ones', () => {
    expect(isDayKey('2026-02-28')).toBe(true);
    expect(isDayKey('2026-02-31')).toBe(false);
    expect(isDayKey('2026-2-8')).toBe(false);
    expect(isDayKey('')).toBe(false);
    expect(isDayKey(20260228)).toBe(false);
  });

  it('walks days across month and year ends', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });

  it('counts whole days between keys', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
    expect(daysBetween('2026-01-01', '2026-03-07')).toBe(65);
    expect(daysBetween('2026-03-07', '2026-01-01')).toBe(-65);
  });

  it('builds inclusive ranges', () => {
    expect(dayKeyRange('2026-01-01', '2026-01-03')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ]);
    expect(dayKeyRange('2026-01-03', '2026-01-01')).toEqual([]);
  });

  it('survives a daylight-saving jump in a zone that has one', () => {
    // Taiwan has no DST, but the day-key maths must not drift in zones that do.
    expect(dayKey(new Date('2026-03-08T07:30:00Z'), 'America/Los_Angeles')).toBe('2026-03-07');
    expect(dayKey(new Date('2026-03-08T08:30:00Z'), 'America/Los_Angeles')).toBe('2026-03-08');
  });
});

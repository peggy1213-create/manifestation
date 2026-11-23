import { describe, expect, it } from 'vitest';
import { CYCLE_LENGTH_DAYS, buildPath, countAhead, countRecorded, samplePath } from './cycle';

describe('buildPath', () => {
  it('lays out 66 days by default', () => {
    const days = buildPath({ currentDay: 1, recordedDays: [] });
    expect(CYCLE_LENGTH_DAYS).toBe(66);
    expect(days).toHaveLength(66);
    expect(days[0]?.day).toBe(1);
    expect(days.at(-1)?.day).toBe(66);
  });

  it('marks recorded, not-recorded, today and ahead', () => {
    const days = buildPath({ currentDay: 4, recordedDays: [1, 3], length: 6 });
    expect(days.map((day) => day.state)).toEqual([
      'recorded',
      'not-recorded',
      'recorded',
      'today',
      'ahead',
      'ahead',
    ]);
  });

  it("treats today's own footprint as recorded", () => {
    const days = buildPath({ currentDay: 2, recordedDays: [2], length: 3 });
    expect(days[1]?.state).toBe('recorded');
  });

  it('ignores duplicate recorded days', () => {
    const days = buildPath({ currentDay: 3, recordedDays: [1, 1, 1], length: 3 });
    expect(countRecorded(days)).toBe(1);
  });

  it('rejects a current day outside the cycle', () => {
    expect(() => buildPath({ currentDay: 0, recordedDays: [] })).toThrow(RangeError);
    expect(() => buildPath({ currentDay: 67, recordedDays: [] })).toThrow(RangeError);
    expect(() => buildPath({ currentDay: 1.5, recordedDays: [] })).toThrow(RangeError);
  });

  it('rejects a recorded day outside the cycle', () => {
    expect(() => buildPath({ currentDay: 1, recordedDays: [0], length: 5 })).toThrow(RangeError);
    expect(() => buildPath({ currentDay: 1, recordedDays: [6], length: 5 })).toThrow(RangeError);
  });

  it('rejects a length that is not a positive integer', () => {
    expect(() => buildPath({ currentDay: 1, recordedDays: [], length: 0 })).toThrow(RangeError);
  });
});

describe('counts', () => {
  it('counts footprints and the days still ahead', () => {
    const days = buildPath({ currentDay: 4, recordedDays: [1, 3], length: 6 });
    expect(countRecorded(days)).toBe(2);
    expect(countAhead(days)).toBe(3);
  });
});

describe('samplePath', () => {
  it('is a 66-day path with 20 footprints, day 24 open', () => {
    const days = samplePath();
    expect(days).toHaveLength(66);
    expect(countRecorded(days)).toBe(20);
    expect(days[23]?.state).toBe('today');
    expect(days[6]?.state).toBe('not-recorded');
    expect(days[64]?.state).toBe('ahead');
  });
});

import { describe, expect, it } from 'vitest';
import type { CheckinStatus } from './checkin';
import { cycleStats, gentleStreak } from './stats';

const startedOn = '2026-01-01';

function day(dayDate: string, status: CheckinStatus) {
  return { dayDate, status };
}

describe('gentle streak', () => {
  it('counts recent days with action', () => {
    expect(
      gentleStreak({
        startedOn,
        today: '2026-01-05',
        checkins: [
          day('2026-01-03', 'done'),
          day('2026-01-04', 'partial'),
          day('2026-01-05', 'done'),
        ],
      }),
    ).toBe(3);
  });

  it('does not break because today is still blank', () => {
    expect(
      gentleStreak({
        startedOn,
        today: '2026-01-05',
        checkins: [day('2026-01-03', 'done'), day('2026-01-04', 'done')],
      }),
    ).toBe(2);
  });

  it('forgives a single blank day', () => {
    expect(
      gentleStreak({
        startedOn,
        today: '2026-01-05',
        checkins: [day('2026-01-03', 'done'), day('2026-01-05', 'done')],
      }),
    ).toBe(2);
  });

  it('ends after two blank days in a row, without going negative', () => {
    expect(
      gentleStreak({
        startedOn,
        today: '2026-01-06',
        checkins: [day('2026-01-01', 'done'), day('2026-01-02', 'done'), day('2026-01-06', 'done')],
      }),
    ).toBe(1);
  });

  it('treats 今天沒做到 as a blank day, not a penalty', () => {
    expect(
      gentleStreak({
        startedOn,
        today: '2026-01-04',
        checkins: [
          day('2026-01-02', 'done'),
          day('2026-01-03', 'missed'),
          day('2026-01-04', 'done'),
        ],
      }),
    ).toBe(2);
  });

  it('is zero before the first day with action', () => {
    expect(gentleStreak({ startedOn, today: '2026-01-03', checkins: [] })).toBe(0);
    expect(
      gentleStreak({ startedOn, today: '2026-01-03', checkins: [day('2026-01-02', 'missed')] }),
    ).toBe(0);
  });
});

describe('cycle stats', () => {
  it('counts days acted, split by 做到了 and 部分', () => {
    const stats = cycleStats({
      startedOn,
      today: '2026-01-04',
      checkins: [
        day('2026-01-01', 'done'),
        day('2026-01-02', 'partial'),
        day('2026-01-03', 'missed'),
        day('2026-01-04', 'done'),
      ],
    });

    expect(stats.daysActed).toBe(3);
    expect(stats.daysFull).toBe(2);
    expect(stats.daysPartial).toBe(1);
    expect(stats.elapsedDays).toBe(4);
    expect(stats.cycleDays).toBe(66);
  });

  it('ignores check-ins from outside the path', () => {
    const stats = cycleStats({
      startedOn,
      today: '2026-03-08',
      checkins: [day('2025-12-31', 'done'), day('2026-03-08', 'done'), day('2026-01-01', 'done')],
      rehearsalDays: ['2026-01-01', '2026-03-08'],
    });

    expect(stats.daysActed).toBe(1);
    expect(stats.rehearsals).toBe(1);
  });

  it('leaves an unrecorded today out of follow-through, so it never reads as a drop', () => {
    const upToYesterday = cycleStats({
      startedOn,
      today: '2026-01-03',
      checkins: [day('2026-01-01', 'done'), day('2026-01-02', 'done')],
    });
    // Two closed days, both acted: 100%, even though today is still open.
    expect(upToYesterday.followThroughPercent).toBe(100);

    const withToday = cycleStats({
      startedOn,
      today: '2026-01-03',
      checkins: [day('2026-01-01', 'done'), day('2026-01-02', 'done'), day('2026-01-03', 'missed')],
    });
    // Recording today brings it into the denominator: 2 of 3.
    expect(withToday.followThroughPercent).toBe(67);
  });

  it('has no follow-through figure on day 1 before anything is recorded', () => {
    const stats = cycleStats({ startedOn, today: '2026-01-01', checkins: [] });
    expect(stats.followThroughPercent).toBeNull();
    expect(stats.daysActed).toBe(0);
    expect(stats.gentleStreak).toBe(0);
  });

  it('counts completed rehearsals in the cycle', () => {
    const stats = cycleStats({
      startedOn,
      today: '2026-01-05',
      checkins: [],
      rehearsalDays: ['2026-01-01', '2026-01-01', '2026-01-04'],
    });
    expect(stats.rehearsals).toBe(3);
  });
});

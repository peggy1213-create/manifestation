import { describe, expect, it } from 'vitest';
import {
  CYCLE_LENGTH,
  buildPath,
  cycleBounds,
  cyclePosition,
  dateOfDay,
  dayIndex,
  footprintsByDate,
  stoneState,
  type Footprint,
  type StoneState,
} from './cycle';

const START = '2026-03-01';

/** 'did' on every day listed, so a test can name the days it cares about. */
function did(...days: number[]): Footprint[] {
  return days.map((day) => ({ date: dateOfDay(START, 1, day), quality: 'did' as const }));
}

describe('CYCLE_LENGTH', () => {
  it('is 66 days', () => {
    expect(CYCLE_LENGTH).toBe(66);
  });
});

describe('dayIndex', () => {
  it('counts day 1 as the start date itself', () => {
    expect(dayIndex(START, '2026-03-01')).toBe(1);
    expect(dayIndex(START, '2026-03-02')).toBe(2);
    expect(dayIndex(START, '2026-05-05')).toBe(66);
  });

  it('goes non-positive before the path begins', () => {
    expect(dayIndex(START, '2026-02-28')).toBe(0);
    expect(dayIndex(START, '2026-02-27')).toBe(-1);
  });
});

describe('cyclePosition', () => {
  it('places the first and last day of cycle 1', () => {
    expect(cyclePosition(START, '2026-03-01')).toEqual({ cycle: 1, dayInCycle: 1, dayIndex: 1 });
    expect(cyclePosition(START, '2026-05-05')).toEqual({ cycle: 1, dayInCycle: 66, dayIndex: 66 });
  });

  it('rolls into cycle 2 on day 67', () => {
    expect(cyclePosition(START, '2026-05-06')).toEqual({ cycle: 2, dayInCycle: 1, dayIndex: 67 });
    expect(cyclePosition(START, '2026-07-10')).toEqual({ cycle: 2, dayInCycle: 66, dayIndex: 132 });
    expect(cyclePosition(START, '2026-07-11')).toEqual({ cycle: 3, dayInCycle: 1, dayIndex: 133 });
  });

  it('is null before the path begins', () => {
    expect(cyclePosition(START, '2026-02-28')).toBeNull();
  });

  it('rejects a nonsensical cycle length', () => {
    expect(() => cyclePosition(START, '2026-03-01', 0)).toThrow(RangeError);
  });
});

describe('cycleBounds and dateOfDay', () => {
  it('spans 66 days per cycle with no gap between cycles', () => {
    expect(cycleBounds(START, 1)).toEqual({ cycle: 1, start: '2026-03-01', end: '2026-05-05' });
    expect(cycleBounds(START, 2)).toEqual({ cycle: 2, start: '2026-05-06', end: '2026-07-10' });
  });

  it('finds the calendar day of a day in a cycle', () => {
    expect(dateOfDay(START, 1, 1)).toBe('2026-03-01');
    expect(dateOfDay(START, 1, 66)).toBe('2026-05-05');
    expect(dateOfDay(START, 2, 1)).toBe('2026-05-06');
  });

  it('rejects days outside a cycle', () => {
    expect(() => dateOfDay(START, 1, 0)).toThrow(RangeError);
    expect(() => dateOfDay(START, 1, 67)).toThrow(RangeError);
    expect(() => cycleBounds(START, 0)).toThrow(RangeError);
  });
});

describe('stoneState', () => {
  const today = '2026-03-10';

  it('reports what was recorded for a past day', () => {
    expect(stoneState('2026-03-09', today, 'did')).toBe('did');
    expect(stoneState('2026-03-09', today, 'partly')).toBe('partly');
  });

  it('reports a past day with nothing recorded as missed', () => {
    expect(stoneState('2026-03-09', today)).toBe('missed');
  });

  it('reports today as today while it is still open', () => {
    expect(stoneState(today, today)).toBe('today');
  });

  it('reports what was recorded once today has been recorded', () => {
    expect(stoneState(today, today, 'did')).toBe('did');
    expect(stoneState(today, today, 'partly')).toBe('partly');
  });

  it('reports days still ahead as future, even if something was recorded against them', () => {
    expect(stoneState('2026-03-11', today)).toBe('future');
    expect(stoneState('2026-03-11', today, 'did')).toBe('future');
  });
});

describe('footprintsByDate', () => {
  it('keeps the kinder record when one day carries two', () => {
    const byDate = footprintsByDate([
      { date: '2026-03-01', quality: 'partly' },
      { date: '2026-03-01', quality: 'did' },
      { date: '2026-03-02', quality: 'did' },
      { date: '2026-03-02', quality: 'partly' },
    ]);
    expect(byDate.get('2026-03-01')).toBe('did');
    expect(byDate.get('2026-03-02')).toBe('did');
  });

  it('rejects malformed footprints', () => {
    expect(() => footprintsByDate([{ date: '1 March', quality: 'did' }])).toThrow(RangeError);
    expect(() =>
      footprintsByDate([{ date: '2026-03-01', quality: 'failed' as unknown as 'did' }]),
    ).toThrow(RangeError);
  });
});

describe('buildPath', () => {
  it('draws 66 stones, day 1 first, one calendar day apart', () => {
    const path = buildPath({ startDate: START, today: '2026-03-10' });
    expect(path.stones).toHaveLength(66);
    expect(path.stones[0]?.dayInCycle).toBe(1);
    expect(path.stones[0]?.date).toBe('2026-03-01');
    expect(path.stones[65]?.dayInCycle).toBe(66);
    expect(path.stones[65]?.date).toBe('2026-05-05');
  });

  it('marks exactly one stone as today and states where it sits', () => {
    const path = buildPath({ startDate: START, today: '2026-03-10' });
    const todayStones = path.stones.filter((stone) => stone.isToday);
    expect(todayStones).toHaveLength(1);
    expect(todayStones[0]?.dayInCycle).toBe(10);
    expect(path.position).toEqual({ cycle: 1, dayInCycle: 10, dayIndex: 10 });
  });

  it('turns a missed day into a missed stone and leaves its neighbours alone', () => {
    const path = buildPath({
      startDate: START,
      today: '2026-03-05',
      // Day 3 (2026-03-03) was missed.
      footprints: [...did(1, 2, 4)],
    });
    const states = path.stones.slice(0, 6).map((stone) => stone.state);
    expect(states).toEqual<StoneState[]>(['did', 'did', 'missed', 'did', 'today', 'future']);
  });

  it('keeps the footprint on today while ringing it', () => {
    const path = buildPath({ startDate: START, today: '2026-03-05', footprints: did(5) });
    const stone = path.stones[4];
    expect(stone?.state).toBe('did');
    expect(stone?.isToday).toBe(true);
    expect(stone?.quality).toBe('did');
  });

  it('shows every day as future before the path begins', () => {
    const path = buildPath({ startDate: START, today: '2026-02-20' });
    expect(path.cycle).toBe(1);
    expect(path.position).toBeNull();
    expect(path.stones.every((stone) => stone.state === 'future')).toBe(true);
  });

  it('shows every day as missed or recorded once the cycle is over', () => {
    const path = buildPath({ startDate: START, today: '2026-06-01', cycle: 1, footprints: did(1) });
    expect(path.position).toBeNull();
    expect(path.stones[0]?.state).toBe('did');
    expect(path.stones.slice(1).every((stone) => stone.state === 'missed')).toBe(true);
  });

  it('follows today into cycle 2 and numbers the days across cycles', () => {
    const path = buildPath({ startDate: START, today: '2026-05-10' });
    expect(path.cycle).toBe(2);
    expect(path.bounds).toEqual({ cycle: 2, start: '2026-05-06', end: '2026-07-10' });
    expect(path.stones[0]?.dayIndex).toBe(67);
    expect(path.stones[4]?.isToday).toBe(true);
    expect(path.stones[65]?.dayIndex).toBe(132);
  });

  it('can draw an earlier cycle, with no stone ringed as today', () => {
    const path = buildPath({ startDate: START, today: '2026-05-10', cycle: 1 });
    expect(path.cycle).toBe(1);
    expect(path.position).toBeNull();
    expect(path.stones.some((stone) => stone.isToday)).toBe(false);
  });

  it('ignores footprints from outside the cycle it is drawing', () => {
    const path = buildPath({
      startDate: START,
      today: '2026-05-10',
      cycle: 2,
      footprints: [{ date: '2026-03-02', quality: 'did' }],
    });
    expect(path.stones.every((stone) => stone.quality === null)).toBe(true);
  });

  it('resolves today from the time zone when today is not given', () => {
    // These two zones are on different calendar days at this instant, which is the point.
    const taipei = buildPath({ startDate: START, timeZone: 'Asia/Taipei' });
    const utc = buildPath({ startDate: START, timeZone: 'UTC' });
    expect([0, 1]).toContain(
      new Date(`${taipei.today}T00:00:00Z`).getTime() / 86_400_000 -
        new Date(`${utc.today}T00:00:00Z`).getTime() / 86_400_000,
    );
  });

  it('works with a shorter cycle for tests and future experiments', () => {
    const path = buildPath({ startDate: START, today: '2026-03-03', cycleLength: 7 });
    expect(path.stones).toHaveLength(7);
    expect(path.cycleLength).toBe(7);
    expect(path.stones[6]?.date).toBe('2026-03-07');
  });
});

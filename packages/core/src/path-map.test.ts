import { describe, expect, it } from 'vitest';
import { buildPathMap } from './path-map';

describe('足跡 path map', () => {
  const base = {
    startedOn: '2026-01-01',
    today: '2026-01-04',
  };

  it('has one cell per day of the path', () => {
    const cells = buildPathMap({ ...base, checkins: [] });
    expect(cells).toHaveLength(66);
    expect(cells[0]).toMatchObject({ dayNumber: 1, dayDate: '2026-01-01' });
    expect(cells[65]).toMatchObject({ dayNumber: 66, dayDate: '2026-03-07' });
  });

  it('marks today, and days still to come', () => {
    const cells = buildPathMap({ ...base, checkins: [] });
    expect(cells[3]).toMatchObject({ dayDate: '2026-01-04', isToday: true, isFuture: false });
    expect(cells[4]).toMatchObject({ isToday: false, isFuture: true });
    expect(cells[0]).toMatchObject({ isToday: false, isFuture: false });
  });

  it('carries each day status, note and photo onto its cell', () => {
    const cells = buildPathMap({
      ...base,
      checkins: [
        { dayDate: '2026-01-01', status: 'done', note: '走了十分鐘', photoKey: null },
        { dayDate: '2026-01-02', status: 'partial', note: null, photoKey: 'users/u1/a.jpg' },
        { dayDate: '2026-01-03', status: 'missed', note: null, photoKey: null },
      ],
    });

    expect(cells[0]).toMatchObject({ status: 'done', hasNote: true, hasPhoto: false });
    expect(cells[1]).toMatchObject({ status: 'partial', hasNote: false, hasPhoto: true });
    expect(cells[2]).toMatchObject({ status: 'missed', hasNote: false, hasPhoto: false });
  });

  it('leaves a day with no check-in blank rather than failed', () => {
    const cells = buildPathMap({ ...base, checkins: [] });
    expect(cells[0]?.status).toBeNull();
    expect(cells[1]?.status).toBeNull();
  });
});

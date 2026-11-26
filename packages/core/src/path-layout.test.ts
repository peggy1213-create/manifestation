import { describe, expect, it } from 'vitest';
import { CYCLE_LENGTH, buildPath } from './cycle';
import { pathLayout } from './path-layout';

/** The widths the path has to survive, from the smallest phone to a wide desktop. */
const WIDTHS = [320, 360, 375, 414, 440, 480, 560, 640, 768, 900, 1024, 1280, 1440];

describe('pathLayout', () => {
  it('lays out one dot per day of the cycle, numbered in order', () => {
    const layout = pathLayout({ width: 375 });
    expect(layout.points).toHaveLength(CYCLE_LENGTH);
    expect(layout.points.map((point) => point.day)).toEqual(
      Array.from({ length: CYCLE_LENGTH }, (_, index) => index + 1),
    );
  });

  it('matches the stones the core logic builds, one for one', () => {
    const { stones } = buildPath({ startDate: '2026-03-01', today: '2026-03-10' });
    const layout = pathLayout({ width: 768, count: stones.length });
    expect(layout.points).toHaveLength(stones.length);
    for (const [index, point] of layout.points.entries()) {
      expect(point.day).toBe(stones[index]?.dayInCycle);
    }
  });

  it.each(WIDTHS)('climbs to the top right at %ipx', (width) => {
    const layout = pathLayout({ width });

    // Day 1 sits at the bottom left, day 66 at the top right.
    expect(layout.first.x).toBe(layout.insetX);
    expect(layout.last.x).toBe(layout.width - layout.insetX);
    expect(layout.last.y).toBeLessThan(layout.first.y);

    const xs = layout.points.map((point) => point.x);
    const ys = layout.points.map((point) => point.y);
    expect(Math.min(...ys)).toBe(layout.last.y);
    expect(Math.max(...ys)).toBe(layout.first.y);
    expect(Math.max(...xs)).toBe(layout.last.x);
    expect(Math.min(...xs)).toBe(layout.first.x);
  });

  it.each(WIDTHS)('keeps every dot and its label inside the box at %ipx', (width) => {
    const layout = pathLayout({ width });
    for (const point of layout.points) {
      expect(point.x).toBeGreaterThanOrEqual(layout.dotRadius);
      expect(point.x).toBeLessThanOrEqual(layout.width - layout.dotRadius);
      expect(point.y).toBeGreaterThanOrEqual(layout.dotRadius);
      expect(point.y).toBeLessThanOrEqual(layout.height - layout.dotRadius);
    }
  });

  it.each(WIDTHS)('never lets two dots collide at %ipx', (width) => {
    const layout = pathLayout({ width });
    // Two touching dots would read as one mark, so keep a clear gap at every width.
    const minDistance = layout.dotRadius * 2 + 4;
    for (let index = 0; index < layout.points.length; index += 1) {
      for (let other = index + 1; other < layout.points.length; other += 1) {
        const a = layout.points[index];
        const b = layout.points[other];
        if (!a || !b) throw new Error('missing point');
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        expect(distance).toBeGreaterThanOrEqual(minDistance);
      }
    }
  });

  it.each(WIDTHS)('rises with every single day at %ipx', (width) => {
    const layout = pathLayout({ width });
    for (let index = 1; index < layout.points.length; index += 1) {
      const previous = layout.points[index - 1];
      const point = layout.points[index];
      if (!previous || !point) throw new Error('missing point');
      expect(point.y).toBeLessThan(previous.y);
    }
  });

  it.each(WIDTHS)('keeps the gap between dots within reach at %ipx', (width) => {
    const layout = pathLayout({ width });
    for (let index = 1; index < layout.points.length; index += 1) {
      const previous = layout.points[index - 1];
      const point = layout.points[index];
      if (!previous || !point) throw new Error('missing point');
      if (point.row !== previous.row) continue;
      const gap = Math.abs(point.x - previous.x);
      expect(gap).toBeGreaterThanOrEqual(20);
      expect(gap).toBeLessThanOrEqual(54);
    }
  });

  it('centres the path rather than stretching it across a very wide container', () => {
    const wide = pathLayout({ width: 2000 });
    expect(wide.insetX).toBeGreaterThan(wide.paddingX);
    // Centred, so the margin on the right matches the one on the left.
    expect(wide.width - wide.last.x).toBe(wide.insetX);
  });

  it('fills the width it is given when there is no room to spare', () => {
    const narrow = pathLayout({ width: 320 });
    expect(narrow.insetX).toBe(narrow.paddingX);
  });

  it('wraps into more rows on a narrow screen than on a wide one', () => {
    const narrow = pathLayout({ width: 320 });
    const wide = pathLayout({ width: 1440 });
    expect(narrow.rows).toBeGreaterThan(wide.rows);
    expect(narrow.columns).toBeLessThan(wide.columns);
  });

  it('always uses an odd number of rows, so the climb ends on the right', () => {
    for (const width of WIDTHS) {
      expect(pathLayout({ width }).rows % 2).toBe(1);
    }
  });

  it('spreads the dots over rows that differ by at most one', () => {
    for (const width of WIDTHS) {
      const layout = pathLayout({ width });
      const sizes = new Map<number, number>();
      for (const point of layout.points) {
        sizes.set(point.row, (sizes.get(point.row) ?? 0) + 1);
      }
      expect(sizes.size).toBe(layout.rows);
      const counts = [...sizes.values()];
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      expect(counts.reduce((total, count) => total + count, 0)).toBe(CYCLE_LENGTH);
    }
  });

  it('alternates direction so the path switchbacks instead of jumping', () => {
    const layout = pathLayout({ width: 768 });
    const byRow = new Map<number, number[]>();
    for (const point of layout.points) {
      byRow.set(point.row, [...(byRow.get(point.row) ?? []), point.x]);
    }
    for (const [row, xs] of byRow) {
      const first = xs[0];
      const last = xs[xs.length - 1];
      if (first === undefined || last === undefined) throw new Error('empty row');
      if (xs.length > 1) {
        // Even rows run left to right, odd rows run back to the left.
        expect(row % 2 === 0 ? last > first : last < first).toBe(true);
      }
    }
  });

  it('starts the trail at day 1 and curves at every turn', () => {
    const layout = pathLayout({ width: 375 });
    expect(layout.trail.startsWith(`M ${layout.first.x} ${layout.first.y}`)).toBe(true);
    const turns = layout.trail.split('C').length - 1;
    expect(turns).toBe(layout.rows - 1);
    expect(layout.trail.endsWith(`${layout.last.x} ${layout.last.y}`)).toBe(true);
  });

  it('grows taller as it wraps into more rows', () => {
    const narrow = pathLayout({ width: 320 });
    const wide = pathLayout({ width: 1024 });
    expect(narrow.height).toBeGreaterThan(0);
    expect(wide.height).toBeGreaterThan(0);
    expect(narrow.rows).toBeGreaterThan(wide.rows);
  });

  it('honours an explicit row gap, radius and padding', () => {
    const layout = pathLayout({
      width: 600,
      rowGap: 40,
      dotRadius: 6,
      paddingX: 30,
      paddingTop: 20,
      paddingBottom: 20,
    });
    expect(layout.rowGap).toBe(40);
    expect(layout.dotRadius).toBe(6);
    expect(layout.first.x).toBe(30);
    expect(layout.last.x).toBe(570);
  });

  it('handles a tiny count and a very narrow container', () => {
    const layout = pathLayout({ width: 1, count: 1 });
    expect(layout.points).toHaveLength(1);
    expect(layout.first).toEqual(layout.last);
    expect(layout.height).toBeGreaterThan(0);
  });

  it('rejects a bad count or width', () => {
    expect(() => pathLayout({ width: 320, count: 0 })).toThrow(RangeError);
    expect(() => pathLayout({ width: 320, count: 1.5 })).toThrow(RangeError);
    expect(() => pathLayout({ width: Number.NaN })).toThrow(RangeError);
  });
});

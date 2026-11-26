// Where the 66 dots sit. Pure numbers: no SVG, no React, so apps/web and the future Expo path
// map draw the same climb.
//
// The path is a switchback trail. Row 0 runs left to right along the bottom, row 1 turns and runs
// back to the left above it, and so on, climbing with every dot. An odd number of rows means the
// last row travels left to right, so the last day always lands at the top right.

import { CYCLE_LENGTH } from './cycle';

export interface PathLayoutOptions {
  /** Pixels available across. The caller measures this; the layout never guesses. */
  width: number;
  /** How many dots. Defaults to one cycle. */
  count?: number;
  /** The gap between dots a row aims for; the path wraps to another row to keep near it. */
  targetSpacing?: number;
  /** Widest gap between dots. Past this the path stops stretching and centres itself instead. */
  maxSpacing?: number;
  /** Cap on dots per row, so a wide screen gets a legible climb instead of one long line. */
  maxColumns?: number;
  minRows?: number;
  maxRows?: number;
  /** Vertical distance between rows. Defaults to a value derived from `width`. */
  rowGap?: number;
  dotRadius?: number;
  /** Side padding. Defaults to leaving room for a dot plus its ring. */
  paddingX?: number;
  /** Room above the last dot for its label. */
  paddingTop?: number;
  /** Room below the first dot for its label. */
  paddingBottom?: number;
}

export interface PathPoint {
  /** 1-based position along the path. */
  day: number;
  x: number;
  y: number;
  /** 0 is the bottom row. */
  row: number;
  /** 0-based position within the row, in travel order. */
  column: number;
}

export interface PathLayout {
  width: number;
  height: number;
  rows: number;
  /** Dots in the longest row. */
  columns: number;
  rowGap: number;
  dotRadius: number;
  paddingX: number;
  /** Distance from the left edge to day 1. Equal to `paddingX` unless the path is centred. */
  insetX: number;
  points: PathPoint[];
  /** `d` for the trail that joins the dots. */
  trail: string;
  first: PathPoint;
  last: PathPoint;
}

const DEFAULTS = {
  targetSpacing: 30,
  maxSpacing: 54,
  /** Few enough per row that the path reads as a climb rather than as stacked stripes. */
  maxColumns: 14,
  minRows: 3,
  maxRows: 11,
} as const;

/**
 * How far a row climbs along its own length, as a share of the gap between rows. High enough that
 * every row visibly rises; low enough that the two dots either side of a turn stay well apart.
 */
const TILT_RATIO = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Half-pixel precision for the box itself: crisp edges without fighting the browser's rounding. */
function round(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Two decimals for the dots. A row's climb is small enough that half-pixel steps would land two
 * neighbouring dots at the same height, and the climb has to be visible between every pair.
 */
function precise(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Spread `count` dots over `rows` rows, longest rows first, never differing by more than one. */
function rowSizes(count: number, rows: number): number[] {
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({ length: rows }, (_, row) => base + (row < extra ? 1 : 0));
}

function chooseRows(count: number, usableWidth: number, options: PathLayoutOptions): number {
  const targetSpacing = options.targetSpacing ?? DEFAULTS.targetSpacing;
  const maxColumns = options.maxColumns ?? DEFAULTS.maxColumns;
  const minRows = options.minRows ?? DEFAULTS.minRows;
  const maxRows = options.maxRows ?? DEFAULTS.maxRows;

  // As many dots per row as fit at a comfortable spacing, then wrap. A narrow screen therefore
  // climbs through more rows than a wide one.
  const columnCap = clamp(Math.floor(usableWidth / targetSpacing) + 1, 2, Math.max(2, maxColumns));
  let rows = Math.max(Math.ceil(count / columnCap), Math.max(1, minRows));
  // Odd, so the top row travels left to right and the last day lands at the top right.
  if (rows % 2 === 0) rows += 1;
  const ceiling = Math.max(1, maxRows % 2 === 0 ? maxRows - 1 : maxRows);
  if (rows > ceiling) rows = ceiling;
  return Math.max(1, Math.min(rows, count));
}

/**
 * Lay out the dots for a path `width` pixels across.
 *
 * The height falls out of the number of rows, so the caller gives a width and gets back a box to
 * draw at real size — no scaling, no guessed aspect ratio.
 */
export function pathLayout(options: PathLayoutOptions): PathLayout {
  const count = options.count ?? CYCLE_LENGTH;
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`count must be a positive whole number, received ${count}`);
  }
  if (!Number.isFinite(options.width)) {
    throw new RangeError('pathLayout needs a finite width');
  }

  const width = Math.max(options.width, 160);
  const dotRadius = options.dotRadius ?? round(clamp(width / 90, 4, 7));
  const paddingX = options.paddingX ?? round(clamp(dotRadius * 2 + 10, 18, 40));
  const paddingTop = options.paddingTop ?? round(dotRadius + 22);
  const paddingBottom = options.paddingBottom ?? round(dotRadius + 24);
  const rowGap = options.rowGap ?? round(clamp(width / 16, 30, 46));

  const usableWidth = Math.max(width - paddingX * 2, 1);
  const rows = chooseRows(count, usableWidth, options);
  const sizes = rowSizes(count, rows);
  const columns = Math.max(...sizes);

  // On a wide screen the dots would drift absurdly far apart, so the path stops stretching at
  // `maxSpacing` and sits centred instead.
  // Every row is spread over the same width, so the shortest row is the one that would open up
  // the widest gaps; measure the cap against it.
  const maxSpacing = options.maxSpacing ?? DEFAULTS.maxSpacing;
  const shortestRow = Math.min(...sizes);
  const drawWidth = shortestRow > 1 ? Math.min(usableWidth, (shortestRow - 1) * maxSpacing) : 0;
  const insetX = round((width - drawWidth) / 2);

  // Each row also climbs a little as you travel along it, so no two dots share a height and the
  // whole line reads as a climb rather than as stacked rows.
  const tilt = round(rowGap * TILT_RATIO);
  const height = round(paddingTop + (rows - 1) * rowGap + tilt + paddingBottom);
  const bottomY = round(height - paddingBottom);

  const points: PathPoint[] = [];
  let day = 0;
  for (let row = 0; row < rows; row += 1) {
    const size = sizes[row] ?? 0;
    const rightwards = row % 2 === 0;
    const baseY = bottomY - row * rowGap;
    for (let column = 0; column < size; column += 1) {
      const progress = size === 1 ? 0 : column / (size - 1);
      const fraction = rightwards ? progress : 1 - progress;
      day += 1;
      points.push({
        day,
        x: precise(insetX + fraction * drawWidth),
        y: precise(baseY - tilt * progress),
        row,
        column,
      });
    }
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) throw new Error('pathLayout produced no points');

  return {
    width: round(width),
    height,
    rows,
    columns,
    rowGap,
    dotRadius,
    paddingX,
    insetX,
    points,
    trail: trailPath(points, rowGap, paddingX),
    first,
    last,
  };
}

/**
 * The trail joining the dots: straight within a row, a hairpin at each switchback that bulges
 * out past the turn the way a drawn line would.
 */
function trailPath(points: readonly PathPoint[], rowGap: number, paddingX: number): string {
  const head = points[0];
  if (!head) return '';
  const bulge = round(Math.min(paddingX * 0.75, rowGap * 0.6));
  const segments: string[] = [`M ${head.x} ${head.y}`];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (!previous || !point) continue;
    if (point.row === previous.row) {
      segments.push(`L ${point.x} ${point.y}`);
      continue;
    }
    // A turn: push both control points outward so the line curls around instead of kinking.
    const outward = previous.row % 2 === 0 ? 1 : -1;
    const controlX = precise(previous.x + outward * bulge);
    segments.push(
      `C ${controlX} ${precise(previous.y - rowGap * 0.3)}` +
        ` ${controlX} ${precise(point.y + rowGap * 0.3)}` +
        ` ${point.x} ${point.y}`,
    );
  }

  return segments.join(' ');
}

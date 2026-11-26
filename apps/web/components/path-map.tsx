'use client';

// The 66-day path (66 天足跡路徑), drawn on graph paper and climbing to the top right.
//
// Every number it draws comes from @clearpath/core: `buildPath` decides each day's state and
// `pathLayout` decides where each dot sits. This file only turns those numbers into SVG, so the
// path map and its tests can never drift apart.
//
// It draws at real size. A ResizeObserver reports the container's width, the layout returns a box
// for that exact width, and the SVG is given that box 1:1 — no scaling, so a 5px dot is 5px at
// 320px and at 1440px.

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import {
  pathLayout,
  pathStats,
  type Path,
  type PathPoint,
  type PathStats,
  type PathStone,
} from '@clearpath/core';
import { fill, messages } from '@/lib/messages';

const copy = messages.pathMap;

export interface PathMapProps {
  /** One cycle of the path, from `buildPath` in @clearpath/core. */
  path: Path;
  /**
   * Width used for the very first render, before the container has been measured. The layout is
   * redrawn at the real width as soon as the ResizeObserver reports it.
   */
  initialWidth?: number;
  /** Cap on dots per row. Lower it for a taller, more compact climb. */
  maxColumns?: number;
  className?: string;
}

export function PathMap({ path, initialWidth = 720, maxColumns, className }: PathMapProps) {
  const { ref, width } = useMeasuredWidth();
  const baseId = useId();
  const gridId = `${baseId}-grid`;
  const halfId = `${baseId}-half`;
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;

  const layout = pathLayout({
    width: width ?? initialWidth,
    count: path.stones.length,
    maxColumns,
  });
  const stats = pathStats(path.stones);
  const { dotRadius } = layout;

  return (
    <div ref={ref} className={className}>
      <svg
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descId}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        /* Measured: real size, 1:1 with the viewBox. Not yet measured: scale to fit for one frame. */
        width={width === null ? undefined : layout.width}
        height={layout.height}
        style={width === null ? { width: '100%' } : undefined}
        className="block"
      >
        <title id={titleId}>{copy.title}</title>
        <desc id={descId}>{summaryText(path, stats)}</desc>

        <defs>
          {/* The faint kraft graph-paper grid. */}
          <pattern id={gridId} width="8" height="8" patternUnits="userSpaceOnUse">
            <path
              d="M 8 0 L 0 0 L 0 8"
              fill="none"
              stroke="var(--cp-kraft)"
              strokeWidth="0.5"
              opacity="0.4"
            />
          </pattern>
          {/* Half a dot, for a day that was partly done. */}
          <clipPath id={halfId} clipPathUnits="objectBoundingBox">
            <rect x="0" y="0.5" width="1" height="0.5" />
          </clipPath>
        </defs>

        <rect width={layout.width} height={layout.height} fill={`url(#${gridId})`} />

        {/* The trail the dots sit on. */}
        <path
          d={layout.trail}
          fill="none"
          stroke="var(--cp-kraft)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />

        {layout.points.map((point) => {
          const stone = path.stones[point.day - 1];
          return stone ? (
            <Stone
              key={point.day}
              stone={stone}
              point={point}
              radius={dotRadius}
              halfClipId={halfId}
            />
          ) : null;
        })}

        {/*
          Day 1 and the last day only: the path should read as a path, not as a calendar.
          Hidden from screen readers, which get the whole summary from <desc> instead.
        */}
        <text
          x={layout.first.x}
          y={layout.first.y + dotRadius + 15}
          textAnchor="start"
          className="cp-path-label"
          aria-hidden="true"
        >
          {fill(copy.dayLabel, { day: 1 })}
        </text>
        <text
          x={layout.last.x}
          y={layout.last.y - dotRadius - 11}
          textAnchor="end"
          className="cp-path-label"
          aria-hidden="true"
        >
          {fill(copy.dayLabel, { day: path.stones.length })}
        </text>
      </svg>
    </div>
  );
}

/**
 * The container's width in CSS pixels, or null until it has been measured.
 *
 * `null` on the first render means the server and the client agree on what to draw; the real
 * width arrives in an effect, and from then on the path is drawn at that exact size.
 */
function useMeasuredWidth(): { ref: RefObject<HTMLDivElement | null>; width: number | null } {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Floor it: a fractional container width would otherwise round the box up and overflow.
    const read = () => {
      const measured = Math.floor(element.getBoundingClientRect().width);
      if (measured > 0) setWidth(measured);
    };
    read();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read);
      return () => window.removeEventListener('resize', read);
    }

    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

interface StoneProps {
  stone: PathStone;
  point: PathPoint;
  radius: number;
  halfClipId: string;
}

/**
 * One dot.
 *
 * did = a filled ink dot, partly = half filled, missed = a small neutral kraft dot, future = an
 * ink outline. Today is ringed in terracotta on top of whatever it already shows, so a recorded
 * today keeps its mark.
 */
function Stone({ stone, point, radius, halfClipId }: StoneProps) {
  const { x, y } = point;
  return (
    <g>
      {stone.state === 'future' && (
        <circle
          cx={x}
          cy={y}
          r={radius}
          fill="none"
          stroke="var(--cp-ink)"
          strokeWidth="1.25"
          opacity="0.3"
        />
      )}

      {/* A missed day is small and neutral. Never red, never crossed out. */}
      {stone.state === 'missed' && (
        <circle cx={x} cy={y} r={Math.max(radius * 0.5, 2.5)} fill="var(--cp-kraft)" />
      )}

      {stone.state === 'did' && <circle cx={x} cy={y} r={radius} fill="var(--cp-ink)" />}

      {stone.state === 'partly' && (
        <>
          <circle cx={x} cy={y} r={radius} fill="none" stroke="var(--cp-ink)" strokeWidth="1.5" />
          <circle cx={x} cy={y} r={radius} fill="var(--cp-ink)" clipPath={`url(#${halfClipId})`} />
        </>
      )}

      {/* Today with nothing recorded yet: a small terracotta core inside the ring. */}
      {stone.state === 'today' && (
        <circle cx={x} cy={y} r={radius * 0.5} fill="var(--cp-terracotta)" />
      )}

      {stone.isToday && (
        <>
          {/* A ring that is always there, so today is visible with reduced motion too. */}
          <circle
            cx={x}
            cy={y}
            r={radius + 3.5}
            fill="none"
            stroke="var(--cp-terracotta)"
            strokeWidth="1.5"
          />
          <circle
            cx={x}
            cy={y}
            r={radius + 3.5}
            fill="none"
            stroke="var(--cp-terracotta)"
            strokeWidth="1.5"
            className="cp-today-pulse"
          />
        </>
      )}
    </g>
  );
}

/** The screen-reader summary of the whole path, in zh-TW. */
function summaryText(path: Path, stats: PathStats): string {
  const text = copy.summary;
  const total = path.stones.length;

  if (stats.elapsedDays === 0) {
    return fill(text.beforeStart, { total, date: path.bounds.start });
  }

  const parts = [
    path.position
      ? fill(text.inProgress, { cycle: path.cycle, total, day: path.position.dayInCycle })
      : fill(text.finished, { cycle: path.cycle, total }),
    fill(text.recorded, {
      recorded: stats.recordedDays,
      did: stats.didDays,
      partly: stats.partlyDays,
    }),
    stats.missedDays > 0 ? fill(text.missed, { missed: stats.missedDays }) : text.noMissed,
  ];

  if (stats.remainingDays > 0) {
    parts.push(fill(text.remaining, { remaining: stats.remainingDays }));
  }
  parts.push(
    stats.currentStreak > 0 ? fill(text.streak, { streak: stats.currentStreak }) : text.noStreak,
  );
  if (stats.followThroughPercent !== null) {
    parts.push(
      fill(text.followThrough, {
        closed: stats.closedDays,
        recorded: stats.recordedDays,
        percent: stats.followThroughPercent,
      }),
    );
  }
  if (path.position) {
    parts.push(stats.recordedToday ? text.todayDone : text.todayOpen);
  }

  return parts.join('');
}

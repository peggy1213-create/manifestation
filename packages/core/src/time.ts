/**
 * Day keys. A day key is a calendar date as `YYYY-MM-DD`, resolved in the user's
 * own time zone (Asia/Taipei by default) rather than UTC, so "今天" means the day
 * the person is actually living in.
 */

export type DayKey = string;

export const DEFAULT_TIME_ZONE = 'Asia/Taipei';

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    // en-CA formats as YYYY-MM-DD, which is exactly the day-key shape.
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string' || !DAY_KEY_PATTERN.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed)) return false;
  // Rejects 2026-02-31 and friends, which Date.parse would roll over.
  return new Date(parsed).toISOString().slice(0, 10) === value;
}

export function assertDayKey(value: unknown): DayKey {
  if (!isDayKey(value)) {
    throw new TypeError(`Not a day key (YYYY-MM-DD): ${String(value)}`);
  }
  return value;
}

/** The calendar day `at` falls on, in `timeZone`. */
export function dayKey(at: Date = new Date(), timeZone: string = DEFAULT_TIME_ZONE): DayKey {
  return formatterFor(timeZone).format(at);
}

/** Today's day key in `timeZone`. */
export function today(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): DayKey {
  return dayKey(now, timeZone);
}

export function addDays(key: DayKey, days: number): DayKey {
  const base = Date.parse(`${assertDayKey(key)}T00:00:00Z`);
  return new Date(base + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function previousDay(key: DayKey): DayKey {
  return addDays(key, -1);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  const a = Date.parse(`${assertDayKey(from)}T00:00:00Z`);
  const b = Date.parse(`${assertDayKey(to)}T00:00:00Z`);
  return Math.round((b - a) / MS_PER_DAY);
}

/** Day keys sort correctly as strings, so comparison is lexicographic. */
export function compareDayKeys(a: DayKey, b: DayKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function dayKeyRange(from: DayKey, to: DayKey): DayKey[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, index) => addDays(from, index));
}

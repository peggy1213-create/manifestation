// Calendar-day helpers for Clear Path (顯化).
//
// A footprint (足跡) belongs to a *calendar day in the user's time zone*, not to an instant.
// Someone in Taipei who records at 00:30 on 3 March has recorded for 3 March, even though it is
// still 2 March in UTC. So everything downstream of this module speaks in `LocalDate` strings
// ('YYYY-MM-DD') and never in `Date` objects: string days are immune to DST and to the host's
// own time zone, which on Cloudflare Workers is always UTC.

/** A calendar day, 'YYYY-MM-DD', already resolved in some named time zone. */
export type LocalDate = string;

/** Clear Path is a Taiwan-first product, so Taipei is the default calendar. */
export const DEFAULT_TIME_ZONE = 'Asia/Taipei';

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** `Intl.DateTimeFormat` construction is slow; one formatter per time zone is plenty. */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export interface LocalDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** True when `value` is a well-formed, real calendar day such as '2026-02-28'. */
export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string') return false;
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const parts = {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
    day: Number(value.slice(8, 10)),
  };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return false;
  // Reject 2026-02-30 and friends by round-tripping through UTC.
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return (
    utc.getUTCFullYear() === parts.year &&
    utc.getUTCMonth() === parts.month - 1 &&
    utc.getUTCDate() === parts.day
  );
}

function assertLocalDate(value: unknown, label: string): LocalDate {
  if (!isLocalDate(value)) {
    throw new RangeError(
      `${label} must be a calendar day as 'YYYY-MM-DD', received ${String(value)}`,
    );
  }
  return value;
}

/** Split a `LocalDate` into numbers. Throws on anything that is not a real calendar day. */
export function parseLocalDate(date: LocalDate): LocalDateParts {
  assertLocalDate(date, 'date');
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

export function formatLocalDate(parts: LocalDateParts): LocalDate {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${String(parts.year).padStart(4, '0')}-${month}-${day}`;
}

/**
 * Which calendar day an instant falls on, in `timeZone`.
 *
 * This is the only place an instant becomes a day, so a Worker running in UTC and a phone in
 * Taipei agree on what "today" means.
 */
export function toLocalDate(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): LocalDate {
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('toLocalDate needs a valid Date');
  }
  // 'en-CA' formats as YYYY-MM-DD, but read the parts so a locale surprise cannot shuffle them.
  const parts = dayFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    if (!part) throw new RangeError(`time zone ${timeZone} gave no ${type}`);
    return Number(part.value);
  };
  return formatLocalDate({ year: read('year'), month: read('month'), day: read('day') });
}

/** `today` in `timeZone`. */
export function todayIn(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): LocalDate {
  return toLocalDate(now, timeZone);
}

/** Move a calendar day by whole days. Pure calendar arithmetic: DST cannot shift it. */
export function addDays(date: LocalDate, days: number): LocalDate {
  if (!Number.isInteger(days)) throw new RangeError('addDays needs a whole number of days');
  const { year, month, day } = parseLocalDate(date);
  const moved = new Date(Date.UTC(year, month - 1, day + days));
  return formatLocalDate({
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  });
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  const fromUtc = Date.UTC(a.year, a.month - 1, a.day);
  const toUtc = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/** -1, 0 or 1. `LocalDate` sorts lexicographically, which is also chronological. */
export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  assertLocalDate(a, 'a');
  assertLocalDate(b, 'b');
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

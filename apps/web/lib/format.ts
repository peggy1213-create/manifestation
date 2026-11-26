import type { DayKey } from '@clearpath/core';

/**
 * Day keys are formatted from their UTC midnight with a fixed locale, so the
 * server render and the browser render agree exactly.
 */
const dayFormatter = new Intl.DateTimeFormat('zh-TW', {
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const weekdayFormatter = new Intl.DateTimeFormat('zh-TW', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  timeZone: 'UTC',
});

export function formatDay(day: DayKey): string {
  return dayFormatter.format(new Date(`${day}T00:00:00Z`));
}

export function formatDayWithWeekday(day: DayKey): string {
  return weekdayFormatter.format(new Date(`${day}T00:00:00Z`));
}

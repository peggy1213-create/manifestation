import type { CSSProperties } from 'react';
import { type DayState, type PathDay, countAhead, countRecorded } from '@clearpath/core';
import { getTranslations } from 'next-intl/server';

const DAY_STATES: readonly DayState[] = ['recorded', 'not-recorded', 'today', 'ahead'];

/** Squares, like days inked into graph paper. A missed day is grey, never red. */
const dayClass: Record<DayState, string> = {
  recorded: 'bg-graph',
  'not-recorded': 'bg-day-neutral',
  today: 'bg-coral',
  ahead: 'border border-rule bg-paper',
};

/**
 * The 66-day path. Server-rendered from `@clearpath/core`; the only motion is a
 * CSS fade-in per day and a slow pulse on today, both dropped under
 * `prefers-reduced-motion: reduce`.
 */
export async function PathPreview({ days }: Readonly<{ days: readonly PathDay[] }>) {
  const t = await getTranslations('hero.path');

  const recorded = countRecorded(days);
  const today = days.find((day) => day.state === 'today')?.day ?? days.length;
  const notRecorded = days.filter((day) => day.state === 'not-recorded').length;
  const ahead = countAhead(days);

  return (
    <figure className="rounded-notebook border border-rule bg-paper-2 p-4 sm:p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="text-sm font-bold">{t('label')}</span>
        <span className="text-sm text-ink-muted tabular-nums">
          {t('summary', { day: today, recorded })}
        </span>
      </figcaption>

      <div
        role="img"
        aria-label={t('aria', { day: today, recorded, missed: notRecorded, ahead })}
        className="mt-4 grid grid-cols-11 gap-1 sm:gap-1.5"
      >
        {days.map((day, index) => (
          <span
            key={day.day}
            aria-hidden="true"
            style={{ '--cp-day-index': index } as CSSProperties}
            className={`aspect-square rounded-[0.1875rem] ${dayClass[day.state]} ${
              day.state === 'today' ? 'cp-day-today' : 'cp-day'
            }`}
          />
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        {DAY_STATES.map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2.5 rounded-[0.125rem] ${dayClass[state]}`} />
            {t(`states.${state}`)}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-rule pt-3 text-sm text-ink-muted">{t('caption')}</p>
    </figure>
  );
}

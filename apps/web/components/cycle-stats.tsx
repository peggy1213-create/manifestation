import { useTranslations } from 'next-intl';
import type { CycleStats } from '@clearpath/core';

/**
 * The cycle figures. Every one of them describes what happened; none of them is
 * a target, and nothing here turns a blank day into a warning.
 */
export function CycleStatsPanel({ stats }: { stats: CycleStats }) {
  const t = useTranslations('stats');

  return (
    <section aria-labelledby="stats-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="stats-title" className="text-terracotta text-xl font-bold">
          {t('title')}
        </h2>
        <p className="text-ink-soft text-[0.8125rem]">
          {t('elapsed', { days: stats.elapsedDays, total: stats.cycleDays })}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Tile label={t('daysActed')} value={t('daysActedValue', { days: stats.daysActed })} />
        <Tile
          label={t('streak')}
          value={t('streakValue', { days: stats.gentleStreak })}
          hint={t('streakHint')}
        />
        <Tile
          label={t('followThrough')}
          value={
            stats.followThroughPercent === null
              ? t('followThroughEmpty')
              : `${stats.followThroughPercent}%`
          }
          hint={t('followThroughHint')}
        />
        <Tile label={t('rehearsals')} value={t('rehearsalsValue', { count: stats.rehearsals })} />
      </dl>
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-paper-2 rounded-notebook border-kraft/40 border p-4">
      <dt className="text-ink-soft text-[0.8125rem]">{label}</dt>
      <dd className="text-ink mt-1 text-2xl font-bold tabular-nums">{value}</dd>
      {hint ? <p className="text-ink-faint mt-1 text-[0.8125rem] leading-snug">{hint}</p> : null}
    </div>
  );
}

import { useTranslations } from 'next-intl';
import type { PathCell } from '@clearpath/core';
import { formatDay } from '@/lib/format';

/**
 * 足跡: one cell per day of the 66-day path.
 *
 * A day with nothing recorded is neutral kraft — the same shade whether the
 * person chose 今天沒做到 or simply did not open the app. Nothing here is red,
 * nothing counts down, and no cell is labelled a failure.
 */

/*
 * Each state has its own shape, not only its own shade: a filled dot, a ring, a
 * soft grey dot, a dashed outline. Colour alone never carries the meaning.
 */
const CELL_STYLES = {
  done: { backgroundColor: 'var(--cp-terracotta)' },
  partial: {
    backgroundColor: 'color-mix(in srgb, var(--cp-terracotta) 28%, transparent)',
    border: '2px solid var(--cp-terracotta)',
  },
  blank: { backgroundColor: 'var(--cp-blank)' },
  future: {
    backgroundColor: 'transparent',
    border: '1px dashed color-mix(in srgb, var(--cp-kraft) 75%, transparent)',
  },
} as const satisfies Record<string, React.CSSProperties>;

function cellStyle(cell: PathCell): React.CSSProperties {
  if (cell.isFuture) return CELL_STYLES.future;
  if (cell.status === 'done') return CELL_STYLES.done;
  if (cell.status === 'partial') return CELL_STYLES.partial;
  // 今天沒做到 and a day never opened look exactly the same.
  return CELL_STYLES.blank;
}

export function Footprints({ cells }: { cells: readonly PathCell[] }) {
  const t = useTranslations('footprints');

  function label(cell: PathCell): string {
    const date = formatDay(cell.dayDate);
    const base = cell.isFuture
      ? t('cellFuture', { day: cell.dayNumber, date })
      : cell.status === 'done'
        ? t('cellDone', { day: cell.dayNumber, date })
        : cell.status === 'partial'
          ? t('cellPartial', { day: cell.dayNumber, date })
          : cell.status === 'missed'
            ? t('cellMissed', { day: cell.dayNumber, date })
            : t('cellBlank', { day: cell.dayNumber, date });

    const extras = [
      cell.isToday ? t('isToday') : null,
      cell.hasNote ? t('hasNote') : null,
      cell.hasPhoto ? t('hasPhoto') : null,
    ].filter(Boolean);

    return extras.length > 0 ? `${base}，${extras.join('，')}` : base;
  }

  return (
    <section aria-labelledby="footprints-title" className="space-y-4">
      <h2 id="footprints-title" className="text-terracotta text-xl font-bold">
        {t('title')}
      </h2>

      {/* 11 x 6 cells. The width is capped so a dot never balloons on a wide
          screen; on a 375px phone the columns simply fill the line. */}
      <ul className="grid max-w-96 grid-cols-11 gap-1.5 sm:gap-2" role="list">
        {cells.map((cell) => (
          <li key={cell.dayDate} className="flex items-center justify-center">
            <span
              aria-label={label(cell)}
              className="block aspect-square w-full rounded-full"
              style={{
                ...cellStyle(cell),
                ...(cell.isToday
                  ? {
                      outline: '2px solid var(--cp-terracotta-strong)',
                      outlineOffset: '2px',
                    }
                  : {}),
              }}
              title={label(cell)}
            />
          </li>
        ))}
      </ul>

      <ul className="text-ink-soft flex flex-wrap gap-x-4 gap-y-2 text-[0.8125rem]" role="list">
        <LegendItem label={t('legendDone')} style={CELL_STYLES.done} />
        <LegendItem label={t('legendPartial')} style={CELL_STYLES.partial} />
        <LegendItem label={t('legendBlank')} style={CELL_STYLES.blank} />
        <LegendItem
          label={t('legendToday')}
          style={{
            backgroundColor: 'transparent',
            outline: '2px solid var(--cp-terracotta-strong)',
            outlineOffset: '1px',
          }}
        />
      </ul>
    </section>
  );
}

function LegendItem({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="block size-3 rounded-full" style={style} />
      {label}
    </li>
  );
}

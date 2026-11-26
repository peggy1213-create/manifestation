'use client';

import { useTranslations } from 'next-intl';

/**
 * Shown gently when someone's own words mention hurting themselves. It never blocks what
 * they wrote, and it never claims to be therapy.
 */
export function CareNote() {
  const t = useTranslations('care');

  return (
    <aside
      role="note"
      className="mt-4 rounded-md border border-terracotta/40 bg-paper-2/70 p-4 text-small"
    >
      <p className="font-bold">{t('title')}</p>
      <p className="mt-1 text-ink/80">{t('body')}</p>
      <p className="mt-2">
        <a
          className="font-bold text-terracotta-strong underline underline-offset-4"
          href="tel:1925"
        >
          {t('line')}
        </a>
      </p>
    </aside>
  );
}

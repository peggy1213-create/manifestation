import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  return { title: t('title') };
}

/**
 * Placeholder destination for the home page CTA. The WOOP writing flow and the
 * 66-day footprints screen land here in a later phase; guest mode means no login wall.
 */
export default async function AppPage() {
  const t = await getTranslations('app');

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl sm:text-3xl">{t('title')}</h1>
      <p className="mt-3 max-w-prose text-ink-muted">{t('lede')}</p>
      <p className="mt-4 inline-block text-sm">
        <span className="cp-mark">{t('guest')}</span>
      </p>
      <p className="mt-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-blue-text underline decoration-1 underline-offset-4 hover:no-underline"
        >
          {t('back')}
        </Link>
      </p>
    </div>
  );
}

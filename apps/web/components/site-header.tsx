import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function SiteHeader() {
  const t = await getTranslations('nav');
  const site = await getTranslations('site');

  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center text-base font-bold tracking-tight">
          {site('name')}
        </Link>
        <nav aria-label={t('label')} className="ms-auto flex items-center gap-1">
          <Link
            href="/resources"
            className="flex min-h-11 items-center rounded-notebook px-3 text-sm text-ink-muted hover:text-blue-text"
          >
            {t('resources')}
          </Link>
          <Link
            href="/app"
            className="flex min-h-11 items-center rounded-notebook border border-ink px-3 text-sm font-bold hover:bg-paper-2"
          >
            {t('start')}
          </Link>
        </nav>
      </div>
    </header>
  );
}

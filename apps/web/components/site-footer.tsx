import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const site = await getTranslations('site');

  return (
    <footer aria-label={t('label')} className="border-t border-rule bg-paper-2">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="cp-margin-line pl-5">
          <p className="font-bold">{site('name')}</p>
          <p className="mt-1 text-sm text-ink-muted">{t('tagline')}</p>
          <p className="mt-4 max-w-prose text-sm text-ink-muted">{t('privacy')}</p>
          <p className="mt-2 max-w-prose text-sm text-ink-muted">{t('care')}</p>
        </div>
        <nav aria-label={nav('label')} className="flex flex-col items-start">
          <Link
            href="/"
            className="flex min-h-11 items-center text-sm text-ink-muted hover:text-blue-text"
          >
            {nav('home')}
          </Link>
          <Link
            href="/resources"
            className="flex min-h-11 items-center text-sm text-ink-muted hover:text-blue-text"
          >
            {nav('resources')}
          </Link>
          <Link
            href="/app"
            className="flex min-h-11 items-center text-sm text-ink-muted hover:text-blue-text"
          >
            {nav('start')}
          </Link>
        </nav>
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <p className="text-sm text-ink-muted tabular-nums">
          {t('copyright', { year: String(new Date().getFullYear()) })}
        </p>
      </div>
    </footer>
  );
}

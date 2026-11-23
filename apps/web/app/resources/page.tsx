import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { allResources, showDrafts } from '@/lib/resources';
import ResourceLibrary from './ResourceLibrary';

/**
 * Fails the build if anything here opts the page out of static rendering.
 * The filter reads `?topic=` on the client after mount, so the prerendered HTML
 * lists every article.
 */
export const dynamic = 'error';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('resources');
  return {
    title: t('title'),
    description: t('lede'),
    alternates: {
      canonical: '/resources',
      types: { 'application/rss+xml': '/resources/rss.xml' },
    },
    openGraph: {
      title: t('title'),
      description: t('lede'),
      url: '/resources',
      type: 'website',
    },
  };
}

export default async function ResourcesPage() {
  const t = await getTranslations('resources');
  const items = allResources();

  return (
    <main className="cp-grid min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <header>
          <h1 className="m-0 text-[1.75rem] font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="mt-4 mb-0 max-w-prose text-ink-muted">{t('lede')}</p>
        </header>

        {showDrafts() && items.some((article) => article.draft) ? (
          <p className="mt-6 rounded-cp border-l-[3px] border-coral bg-paper-2 px-4 py-3 text-sm text-ink-muted">
            {t('draftNotice')}
          </p>
        ) : null}

        <ResourceLibrary items={items} />
      </div>
    </main>
  );
}

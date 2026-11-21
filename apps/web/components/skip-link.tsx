import { getTranslations } from 'next-intl/server';

/** The first thing in the tab order: jumps past the header to <main>. */
export async function SkipLink() {
  const t = await getTranslations('a11y');

  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-paper focus:px-4 focus:font-bold focus:text-blue-ink focus:shadow-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-graph-blue"
    >
      {t('skipToContent')}
    </a>
  );
}

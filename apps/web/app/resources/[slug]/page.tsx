import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { resourcePath } from '@clearpath/core';
import ArticleMeta from '@/components/resources/ArticleMeta';
import ReferencesBlock from '@/components/resources/ReferencesBlock';
import TopicTag from '@/components/resources/TopicTag';
import { allResources, findResource, loadResourceBody } from '@/lib/resources';

export const dynamic = 'error';
/** Only the slugs below exist; anything else is a 404 rather than a render. */
export const dynamicParams = false;

export function generateStaticParams() {
  return allResources().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = findResource(slug);
  if (!article) return {};

  const canonical = resourcePath(article.slug);

  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical },
    // A draft only ever builds when SHOW_DRAFTS is set, and even then it asks
    // not to be indexed.
    robots: article.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      title: article.title,
      description: article.summary,
      url: canonical,
      type: 'article',
      publishedTime: article.published,
      modifiedTime: article.reviewed,
    },
  };
}

export default async function ResourceArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = findResource(slug);
  if (!article) notFound();

  const Body = await loadResourceBody(article.slug);
  if (!Body) notFound();

  const t = await getTranslations('resources');

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/resources"
          className="font-latin inline-flex min-h-[44px] items-center text-sm text-blue-text underline decoration-graph-blue/40 decoration-1 underline-offset-2 hover:decoration-graph-blue"
        >
          ← {t('backToList')}
        </Link>

        <article className="mt-2">
          <header>
            <TopicTag topic={article.topic} />
            <h1 className="mt-4 mb-3 text-[1.75rem] leading-[1.35] font-bold tracking-tight sm:text-4xl sm:leading-[1.3]">
              {article.title}
            </h1>
            <p className="mt-0 mb-4 text-lg text-ink-muted">{article.summary}</p>
            <ArticleMeta
              charCount={article.charCount}
              published={article.published}
              draft={article.draft}
            />
            {article.draft ? (
              <p className="mt-5 rounded-cp border-l-[3px] border-coral bg-paper-2 px-4 py-3 text-sm text-ink-muted">
                {t('draftNotice')}
              </p>
            ) : null}
          </header>

          {/* The notebook margin line runs down the body copy only, not the header. */}
          <div className="cp-margin-line cp-prose mt-9">
            <Body />
          </div>

          <ReferencesBlock references={article.references} />

          <footer className="mt-10 border-t border-rule pt-7">
            <p className="m-0 text-sm text-ink-muted">
              {t('reviewed')}　<time dateTime={article.reviewed}>{article.reviewed}</time>
            </p>

            {article.exercise ? (
              <Link
                href={article.exercise}
                // The /workspace routes are not built yet, so prefetching them
                // only produces 404s in the console. Drop this once they exist.
                prefetch={false}
                className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-cp bg-graph-blue px-6 py-3 font-bold text-paper transition-opacity hover:opacity-90"
              >
                {t('exerciseCta')}
              </Link>
            ) : null}
          </footer>
        </article>
      </div>
    </main>
  );
}

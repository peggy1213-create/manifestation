import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { findResource, resources } from '@/lib/resources';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return resources.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = findResource(slug);
  if (!article) return {};
  return { title: article.title, description: article.description };
}

export default async function ResourcePage({ params }: PageProps) {
  const { slug } = await params;
  const article = findResource(slug);
  if (!article) notFound();

  const t = await getTranslations('resources');
  const format = await getFormatter();
  const { Content } = article;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="flex flex-wrap gap-x-2 text-xs text-ink-muted tabular-nums">
        <time dateTime={article.publishedAt}>
          {t('published', {
            date: format.dateTime(new Date(article.publishedAt), { dateStyle: 'long' }),
          })}
        </time>
        <span aria-hidden="true">·</span>
        <span>{t('readingTime', { minutes: article.readingMinutes })}</span>
      </p>
      <h1 className="mt-2 text-2xl sm:text-3xl">{article.title}</h1>
      <p className="mt-3 text-ink-muted">{article.description}</p>

      <div className="mt-6 border-t border-rule pt-2">
        <Content />
      </div>

      <h2 className="mt-10 text-base">{t('sourcesTitle')}</h2>
      <ul className="mt-3 space-y-2 border-l-2 border-rule pl-4 text-sm text-ink-muted">
        {article.sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>

      <p className="mt-8">
        <Link
          href="/resources"
          className="inline-flex min-h-11 items-center text-blue-text underline decoration-1 underline-offset-4 hover:no-underline"
        >
          {t('backToIndex')}
        </Link>
      </p>
    </article>
  );
}

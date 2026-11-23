import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { resources } from '@/lib/resources';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('resources');
  return { title: t('indexTitle'), description: t('indexLede') };
}

export default async function ResourcesPage() {
  const t = await getTranslations('resources');
  const format = await getFormatter();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl sm:text-3xl">{t('indexTitle')}</h1>
      <p className="mt-3 max-w-prose text-ink-muted">{t('indexLede')}</p>

      <ul className="mt-8 divide-y divide-rule border-y border-rule">
        {resources.map((article) => (
          <li key={article.slug} className="py-5">
            <p className="flex flex-wrap gap-x-2 text-xs text-ink-muted tabular-nums">
              <time dateTime={article.publishedAt}>
                {t('published', {
                  date: format.dateTime(new Date(article.publishedAt), { dateStyle: 'long' }),
                })}
              </time>
              <span aria-hidden="true">·</span>
              <span>{t('readingTime', { minutes: article.readingMinutes })}</span>
            </p>
            <h2 className="mt-2 text-lg">
              <Link
                href={`/resources/${article.slug}`}
                className="text-blue-text underline decoration-1 underline-offset-4 hover:no-underline"
              >
                {article.title}
              </Link>
            </h2>
            <p className="mt-2 text-[1rem] leading-relaxed text-ink-muted">{article.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

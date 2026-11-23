import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { latestResources } from '@/lib/resources';

export async function LatestResources() {
  const t = await getTranslations('resources');
  const format = await getFormatter();
  const articles = latestResources(3);

  return (
    <section aria-labelledby="resources-title" className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="resources-title" className="text-2xl sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-3 max-w-prose text-ink-muted">{t('lede')}</p>

        <ul className="mt-8 grid gap-3 md:grid-cols-3">
          {articles.map((article) => (
            <li key={article.slug}>
              <article className="flex h-full flex-col rounded-notebook border border-rule bg-paper-2 p-4">
                <p className="flex flex-wrap gap-x-2 text-xs text-ink-muted tabular-nums">
                  <time dateTime={article.publishedAt}>
                    {t('published', {
                      date: format.dateTime(new Date(article.publishedAt), {
                        dateStyle: 'long',
                      }),
                    })}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{t('readingTime', { minutes: article.readingMinutes })}</span>
                </p>
                <h3 className="mt-2 text-lg">
                  <Link
                    href={`/resources/${article.slug}`}
                    className="text-blue-text underline decoration-1 underline-offset-4 hover:no-underline"
                  >
                    {article.title}
                  </Link>
                </h3>
                <p className="mt-2 text-[1rem] leading-relaxed text-ink-muted">
                  {article.description}
                </p>
              </article>
            </li>
          ))}
        </ul>

        <p className="mt-6">
          <Link
            href="/resources"
            className="inline-flex min-h-11 items-center text-blue-text underline decoration-1 underline-offset-4 hover:no-underline"
          >
            {t('all')}
          </Link>
        </p>
      </div>
    </section>
  );
}

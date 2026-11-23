'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  countByTopic,
  filterByTopic,
  isResourceTopic,
  resourcePath,
  RESOURCE_TOPICS,
  type ResourceMeta,
  type ResourceTopic,
} from '@clearpath/core';
import ArticleMeta from '@/components/resources/ArticleMeta';

/**
 * Topic filter chips plus the article list.
 *
 * The chosen topic is mirrored into the URL (`?topic=習慣`) so a filtered view
 * can be shared and the back button works, but it is read from
 * `window.location` after mount rather than with `useSearchParams()`. That
 * matters: `useSearchParams()` in a statically rendered page makes React render
 * the Suspense fallback at build time, which would leave every article card out
 * of the prerendered HTML — bad for crawlers and for readers without
 * JavaScript. Reading it on mount keeps the full list in the static HTML and
 * narrows it once hydrated.
 */
export function ResourceLibrary({ items }: { items: readonly ResourceMeta[] }) {
  const t = useTranslations('resources');
  const [active, setActive] = useState<ResourceTopic | null>(null);

  const readTopicFromUrl = useCallback(() => {
    const requested = new URLSearchParams(window.location.search).get('topic');
    setActive(isResourceTopic(requested) ? requested : null);
  }, []);

  // Apply `?topic=` on first paint, and again when the reader goes back.
  useEffect(() => {
    readTopicFromUrl();
    window.addEventListener('popstate', readTopicFromUrl);
    return () => window.removeEventListener('popstate', readTopicFromUrl);
  }, [readTopicFromUrl]);

  const counts = countByTopic(items);
  const shown = filterByTopic(items, active);

  function select(topic: ResourceTopic | null) {
    setActive(topic);
    const query = topic === null ? '' : `?topic=${encodeURIComponent(topic)}`;
    // `history.pushState` rather than the router: this never needs a server
    // round trip, and it keeps the page out of dynamic rendering.
    window.history.pushState(null, '', `${window.location.pathname}${query}`);
  }

  const chipClass = (selected: boolean) =>
    [
      'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[0.9375rem] transition-colors',
      selected
        ? 'border-graph-blue bg-graph-blue text-paper font-bold'
        : 'border-rule bg-paper text-ink hover:border-graph-blue/60 hover:bg-paper-2',
    ].join(' ');

  return (
    <>
      <nav aria-label={t('filterLegend')} className="mt-8">
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          <li>
            <button
              type="button"
              onClick={() => select(null)}
              aria-pressed={active === null}
              className={chipClass(active === null)}
            >
              {t('all')}
              <span className="font-latin text-[0.8125rem] opacity-70">{items.length}</span>
            </button>
          </li>
          {RESOURCE_TOPICS.map((topic) => {
            const count = counts[topic];
            return (
              <li key={topic}>
                <button
                  type="button"
                  onClick={() => select(topic)}
                  aria-pressed={active === topic}
                  disabled={count === 0}
                  className={`${chipClass(active === topic)} disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  {topic}
                  <span className="font-latin text-[0.8125rem] opacity-70">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <p aria-live="polite" className="mt-5 text-sm text-ink-muted">
        {t('articleCount', { count: shown.length })}
      </p>

      {shown.length === 0 ? (
        <p className="mt-8 rounded-cp border border-dashed border-rule px-5 py-8 text-center text-ink-muted">
          {active === null ? t('empty') : t('emptyForTopic', { topic: active })}
        </p>
      ) : (
        <ul className="mt-6 m-0 list-none space-y-4 p-0">
          {shown.map((article) => (
            <li key={article.slug}>
              <Link
                href={resourcePath(article.slug)}
                className="group block rounded-cp border border-rule bg-paper px-5 py-5 transition-colors hover:border-graph-blue/60 hover:bg-paper-2 sm:px-6"
              >
                <span className="inline-flex items-center rounded-full border border-graph-blue/35 bg-paper-2 px-3 py-1 text-[0.8125rem] leading-none text-ink-muted group-hover:bg-paper">
                  {article.topic}
                </span>
                <h2 className="mt-3 mb-2 text-xl font-bold tracking-tight group-hover:text-blue-text sm:text-[1.375rem]">
                  {article.title}
                </h2>
                <p className="m-0 text-[0.9375rem] leading-[1.7] text-ink-muted">
                  {article.summary}
                </p>
                <ArticleMeta
                  charCount={article.charCount}
                  published={article.published}
                  draft={article.draft}
                  className="mt-4"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default ResourceLibrary;

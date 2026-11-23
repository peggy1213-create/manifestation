import type { ResourceReference } from '@clearpath/core';
import { useTranslations } from 'next-intl';

/**
 * 參考文獻 — the fourth part of every article, rendered from frontmatter so the
 * reference list has exactly one source and the inline <Citation /> links have
 * somewhere to land (`#references`).
 */
export function ReferencesBlock({ references }: { references: readonly ResourceReference[] }) {
  const t = useTranslations('resources');

  return (
    <section
      id="references"
      aria-labelledby="references-heading"
      className="mt-12 scroll-mt-8 border-t border-rule pt-7"
    >
      <h2 id="references-heading" className="mt-0 mb-4 text-lg font-bold">
        {t('references')}
      </h2>
      <ol className="m-0 list-none space-y-4 p-0">
        {references.map((reference) => (
          <li key={reference.url} className="text-[0.9375rem] leading-[1.7] text-ink-muted">
            <span className="font-latin">
              {reference.author} ({reference.year}).
            </span>{' '}
            <cite className="font-latin not-italic">{reference.title}</cite>{' '}
            <a
              href={reference.url}
              className="font-latin break-all text-blue-text underline decoration-graph-blue/40 decoration-1 underline-offset-2 hover:decoration-graph-blue"
              rel="noopener noreferrer"
              target="_blank"
            >
              {reference.url.replace(/^https?:\/\//, '')}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ReferencesBlock;

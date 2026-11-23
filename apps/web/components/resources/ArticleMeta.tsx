import { readingTimeMinutes } from '@clearpath/core';
import { useTranslations } from 'next-intl';

/**
 * Reading time, publication date and the draft badge. Rendered on both the
 * list cards and the article header, so it stays one component.
 */
export function ArticleMeta({
  charCount,
  published,
  draft,
  className = '',
}: {
  charCount: number;
  published: string;
  draft: boolean;
  className?: string;
}) {
  const t = useTranslations('resources');

  return (
    <p
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted ${className}`}
    >
      <span>{t('readingTime', { minutes: readingTimeMinutes(charCount) })}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={published}>{t('published', { date: published })}</time>
      {draft ? (
        <span className="cp-highlight font-latin text-[0.75rem] font-bold tracking-wide">
          {t('draftBadge')}
        </span>
      ) : null}
    </p>
  );
}

export default ArticleMeta;

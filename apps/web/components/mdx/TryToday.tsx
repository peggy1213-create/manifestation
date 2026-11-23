import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

/**
 * The 今天就試 box: the one part of an article that asks for an action rather
 * than attention. Process over outcome, so this gets more room than the prose
 * around it, and the heading sits on a highlighter swipe.
 */
export async function TryToday({
  title,
  minutes,
  children,
}: {
  title?: string;
  minutes?: number;
  children: ReactNode;
}) {
  const t = await getTranslations('mdx');

  return (
    <section className="my-9 rounded-cp border border-rule bg-paper px-5 py-5 sm:px-7 sm:py-6">
      <h3 className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg font-bold">
        <span className="cp-highlight">{t('tryToday')}</span>
        {title ? <span className="font-normal text-ink">{title}</span> : null}
        {typeof minutes === 'number' ? (
          <span className="font-latin text-sm font-normal text-ink-muted">{minutes} min</span>
        ) : null}
      </h3>
      <div className="cp-try-body mt-4 text-[1rem] leading-[1.75]">{children}</div>
    </section>
  );
}

export default TryToday;

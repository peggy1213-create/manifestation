import { samplePath } from '@clearpath/core';
import { getTranslations } from 'next-intl/server';
import { CtaLink } from '@/components/cta-link';
import { PathPreview } from '@/components/path-preview';

export async function Hero() {
  const t = await getTranslations('hero');
  const days = samplePath();

  return (
    <section className="relative isolate overflow-hidden border-b border-rule">
      <div aria-hidden="true" className="cp-grid absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:py-20">
        <div className="cp-margin-line pl-5">
          <p className="text-sm font-bold tracking-wide text-blue-text">{t('eyebrow')}</p>
          <h1 className="mt-3 text-[1.75rem] sm:text-4xl lg:text-[2.75rem]">
            {t.rich('headline', {
              mark: (chunks) => <span className="cp-mark cp-mark-swipe">{chunks}</span>,
            })}
          </h1>
          <p className="mt-5 max-w-prose text-ink-muted">{t('lede')}</p>
          <div className="mt-7">
            <CtaLink href="/app">{t('cta')}</CtaLink>
            <p className="mt-3 text-sm text-ink-muted">{t('ctaNote')}</p>
          </div>
        </div>
        <PathPreview days={days} />
      </div>
    </section>
  );
}

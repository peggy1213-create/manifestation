import { getTranslations } from 'next-intl/server';
import { CtaLink } from '@/components/cta-link';

export async function Closing() {
  const t = await getTranslations('closing');

  return (
    <section aria-labelledby="closing-title" className="relative isolate bg-paper">
      <div aria-hidden="true" className="cp-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <h2 id="closing-title" className="text-2xl sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-3 max-w-prose text-ink-muted">{t('lede')}</p>
        <div className="mt-7">
          <CtaLink href="/app">{t('cta')}</CtaLink>
        </div>
        <p className="mt-3 text-sm text-ink-muted">{t('note')}</p>
      </div>
    </section>
  );
}

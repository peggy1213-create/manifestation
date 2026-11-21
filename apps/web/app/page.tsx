import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { routes } from '@/lib/navigation';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('home', routes.home);
}

const steps = ['woop', 'board', 'rehearsal', 'footprints'] as const;

export default async function HomePage() {
  const t = await getTranslations('pages.home');

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="cp-grid absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:py-20">
          <h1 className="max-w-[18ch] text-[1.875rem] md:text-[2.5rem]">
            {t('heading')}
            <span className="cp-highlight">{t('headingHighlight')}</span>
          </h1>
          <p className="mt-6 max-w-prose text-ink">{t('intro')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={routes.manifestations}
              className="flex min-h-11 items-center rounded-md bg-graph-blue px-5 font-bold text-white transition-opacity hover:opacity-90 dark:text-[#0b1222]"
            >
              {t('ctaPrimary')}
            </Link>
            <Link
              href={routes.resources}
              className="flex min-h-11 items-center rounded-md border border-line px-5 font-bold text-blue-ink transition-colors hover:bg-paper-sunken"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h2 className="text-[1.375rem] md:text-[1.5rem]">{t('stepsHeading')}</h2>
        <ol className="cp-margin-rule mt-6 flex flex-col gap-6 ps-5">
          {steps.map((step, index) => (
            <li key={step}>
              <h3 className="flex items-baseline gap-2 text-[1.0625rem]">
                <span aria-hidden="true" className="text-[0.8125rem] text-ink-muted">
                  {index + 1}
                </span>
                {t(`steps.${step}.title`)}
              </h3>
              <p className="mt-1 max-w-prose text-ink-muted">{t(`steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line bg-paper-2">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="text-[1.125rem]">{t('evidenceHeading')}</h2>
          <p className="mt-3 max-w-prose text-[0.9375rem] text-ink-muted">{t('evidenceBody')}</p>
        </div>
      </section>
    </>
  );
}

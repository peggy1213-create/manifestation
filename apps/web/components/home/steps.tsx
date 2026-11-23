import { getTranslations } from 'next-intl/server';

interface Step {
  letter: string;
  term: string;
  sentence: string;
}

export async function Steps() {
  const t = await getTranslations('steps');
  const items = t.raw('items') as Step[];

  return (
    <section aria-labelledby="steps-title" className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="steps-title" className="text-2xl sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-3 max-w-prose text-ink-muted">{t('lede')}</p>

        <p className="sr-only">{t('flowLabel')}</p>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((step, index) => (
            <li
              key={step.term}
              className="relative rounded-notebook border border-rule bg-paper-2 p-4"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-8 items-center justify-center rounded-full bg-ink font-bold text-paper"
              >
                {step.letter}
              </span>
              <h3 className="mt-3 text-lg">{step.term}</h3>
              <p className="mt-1 text-[1rem] leading-relaxed text-ink-muted">{step.sentence}</p>
              {index < items.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 -right-3 hidden text-ink-muted lg:block"
                >
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

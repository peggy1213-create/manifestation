import { getTranslations } from 'next-intl/server';

export async function BoardPreview() {
  const t = await getTranslations('board');
  const actions = t.raw('actions.items') as string[];

  return (
    <section aria-labelledby="board-title" className="border-b border-rule bg-paper-2">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="board-title" className="text-2xl sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-3 max-w-prose text-ink-muted">{t('lede')}</p>

        <figure className="mt-8">
          <figcaption className="sr-only">{t('sampleLabel')}</figcaption>
          <div className="cp-grid grid gap-3 rounded-notebook border border-rule bg-paper p-3 sm:p-4 md:grid-cols-3">
            {/* 小行動 take the largest area: two columns of three on desktop. */}
            <div className="order-2 rounded-notebook border border-graph bg-paper p-4 md:order-none md:col-span-2 md:row-span-2">
              <p className="text-sm font-bold">{t('actions.label')}</p>
              <p className="text-sm text-ink-muted">{t('actions.hint')}</p>
              <ul className="mt-3 space-y-2">
                {actions.map((action) => (
                  <li
                    key={action}
                    className="rounded-notebook bg-paper-2 px-3 py-2.5 text-[1rem] leading-relaxed"
                  >
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            <div className="order-1 rounded-notebook border border-rule bg-paper p-4 md:order-none">
              <p className="text-sm font-bold">{t('wish.label')}</p>
              <p className="mt-1 text-[1rem] leading-relaxed">{t('wish.text')}</p>
            </div>

            <div className="order-3 rounded-notebook border border-rule bg-paper p-4 md:order-none">
              <p className="text-sm font-bold">{t('outcome.label')}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('outcome.text')}</p>
            </div>

            <div className="order-4 rounded-notebook border border-rule bg-paper p-4 md:order-none md:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-bold">{t('obstacle.label')}</p>
                  <p className="mt-1 text-[1rem] leading-relaxed">{t('obstacle.text')}</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{t('plan.label')}</p>
                  <p className="mt-1 text-[1rem] leading-relaxed">
                    <span className="cp-mark">{t('plan.text')}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="order-5 rounded-notebook border border-dashed border-rule bg-paper p-4 md:order-none">
              <p className="text-sm font-bold">{t('cue.label')}</p>
              <p className="mt-1 text-[1rem] leading-relaxed">{t('cue.text')}</p>
            </div>
          </div>
        </figure>

        <p className="mt-6 max-w-prose text-sm text-ink-muted">{t('note')}</p>
      </div>
    </section>
  );
}

import { getTranslations } from 'next-intl/server';

interface Column {
  kind: 'fantasy' | 'contrast';
  label: string;
  title: string;
  items: string[];
}

export async function Science() {
  const t = await getTranslations('science');
  const columns = t.raw('columns') as Column[];
  const studies = t.raw('studies') as string[];

  return (
    <section aria-labelledby="science-title" className="relative isolate border-b border-rule">
      <div aria-hidden="true" className="cp-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="science-title" className="text-2xl sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-3 max-w-prose text-ink-muted">{t('lede')}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {columns.map((column) => {
            const isContrast = column.kind === 'contrast';
            return (
              <article
                key={column.kind}
                className={`rounded-notebook border bg-paper p-5 ${
                  isContrast
                    ? 'border-graph shadow-[0_2px_0_0_var(--cp-graph-blue)]'
                    : 'border-rule'
                }`}
              >
                <p
                  className={`inline-block text-sm font-bold ${
                    isContrast ? 'cp-mark' : 'text-ink-muted'
                  }`}
                >
                  {column.label}
                </p>
                <h3 className="mt-3 text-lg">{column.title}</h3>
                <ul className="mt-3 space-y-2">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-2 text-[1rem] leading-relaxed">
                      <span aria-hidden="true" className="text-ink-muted">
                        {isContrast ? '✓' : '·'}
                      </span>
                      <span className={isContrast ? '' : 'text-ink-muted'}>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <h3 className="mt-10 text-base">{t('studiesTitle')}</h3>
        <ul className="mt-3 max-w-prose space-y-2 border-l-2 border-rule pl-4 text-sm text-ink-muted">
          {studies.map((study) => (
            <li key={study}>{study}</li>
          ))}
        </ul>
        <p className="mt-6 max-w-prose text-sm text-ink-muted">{t('note')}</p>
      </div>
    </section>
  );
}

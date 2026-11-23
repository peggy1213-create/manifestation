import { getTranslations } from 'next-intl/server';

interface FaqItem {
  question: string;
  answer: string;
}

export async function Faq() {
  const t = await getTranslations('faq');
  const items = t.raw('items') as FaqItem[];

  return (
    <section aria-labelledby="faq-title" className="border-b border-rule bg-paper-2">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="faq-title" className="text-2xl sm:text-3xl">
          {t('title')}
        </h2>

        <div className="mt-6 divide-y divide-rule border-y border-rule">
          {items.map((item) => (
            <details key={item.question} name="faq" className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-bold">
                {item.question}
                <span
                  aria-hidden="true"
                  className="text-ink-muted transition-transform group-open:rotate-45"
                >
                  ＋
                </span>
              </summary>
              <p className="pb-4 text-[1rem] leading-relaxed text-ink-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

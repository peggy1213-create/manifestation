import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { footerNav } from '@/lib/navigation';

export async function SiteFooter() {
  const t = await getTranslations('footer');

  return (
    <footer aria-label={t('label')} className="mt-16 border-t border-line bg-paper-2">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
        <nav aria-label={t('linksLabel')}>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center text-[0.9375rem] text-blue-ink underline-offset-4 hover:underline"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-[0.9375rem] font-bold text-ink">{t('disclaimer')}</p>
        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">{t('support')}</p>
        <p className="text-[0.8125rem] text-ink-muted">
          {t('copyright', { year: String(new Date().getFullYear()) })}
        </p>
      </div>
    </footer>
  );
}

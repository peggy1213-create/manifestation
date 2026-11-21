import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { routes } from '@/lib/navigation';
import { getCurrentUser } from '@/lib/session';
import { AccountNav } from './account-nav';
import { MobileMenu } from './mobile-menu';
import { PrimaryNav } from './primary-nav';

/**
 * `relative z-30` on the header gives the menu panel and the account menu,
 * which are positioned against it, a stacking context above the page content —
 * without it they render behind any positioned element in <main>.
 */
export async function SiteHeader() {
  const t = await getTranslations('site');
  const user = await getCurrentUser();

  return (
    <header className="relative z-30 border-b border-line bg-paper-2">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <Link
          href={routes.home}
          className="flex min-h-11 items-center gap-2 rounded-md pe-2 font-bold text-ink"
        >
          <span className="text-[1.0625rem]">{t('shortName')}</span>
          <span className="text-[0.8125rem] font-normal tracking-wide text-ink-muted">
            Clear Path
          </span>
        </Link>

        <PrimaryNav />

        <div className="ms-auto flex items-center gap-2">
          <AccountNav user={user} />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

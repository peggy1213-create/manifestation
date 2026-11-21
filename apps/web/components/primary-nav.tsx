'use client';

import { useTranslations } from 'next-intl';
import { primaryNav } from '@/lib/navigation';
import { NavLink } from './nav-link';

/** 首頁 · 資源 · 顯化空間, shown in the header from md up. */
export function PrimaryNav() {
  const t = useTranslations('nav');

  return (
    <nav aria-label={t('primaryLabel')} className="ms-4 hidden md:block">
      <ul className="flex items-center gap-1">
        {primaryNav.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              className="flex min-h-11 items-center rounded-md px-3 text-[0.9375rem] text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink aria-[current=page]:font-bold aria-[current=page]:text-blue-ink"
            >
              {t(item.key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

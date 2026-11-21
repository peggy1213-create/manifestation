'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { spaceNav } from '@/lib/navigation';
import { NavLink } from './nav-link';

type Variant = 'tabbar' | 'inline';

/**
 * Navigation for the 顯化空間 screens, in two presentations:
 *
 * - `tabbar` — a bottom tab bar, mobile only (the header menu is hidden there).
 * - `inline` — a horizontal sub-nav under the header, from md up.
 *
 * Both are rendered; the one that does not apply is `display: none`, so it is
 * out of the tab order and hidden from assistive technology.
 */
export function SpaceNav({ variant }: { variant: Variant }) {
  const t = useTranslations('spaceNav');

  if (variant === 'inline') {
    return (
      <nav aria-label={t('label')} className="hidden border-b border-line bg-paper-2 md:block">
        <ul className="mx-auto flex max-w-5xl items-center gap-1 px-4">
          {spaceNav.map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                className="flex min-h-11 items-center gap-2 rounded-md px-3 text-[0.9375rem] text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink aria-[current=page]:font-bold aria-[current=page]:text-blue-ink"
              >
                <SpaceIcon name={item.key} />
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      data-tabbar=""
      aria-label={t('label')}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch">
        {spaceNav.map((item) => (
          <li key={item.href} className="flex-1">
            <NavLink
              item={item}
              className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] text-ink-muted aria-[current=page]:font-bold aria-[current=page]:text-blue-ink"
            >
              <SpaceIcon name={item.key} />
              {t(item.key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Plain line icons, in the spirit of a pencil sketch in a lab notebook. */
function SpaceIcon({ name }: { name: (typeof spaceNav)[number]['key'] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
}

const icons: Record<(typeof spaceNav)[number]['key'], ReactNode> = {
  // A day on the calendar.
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
    </>
  ),
  // A written page.
  manifestations: (
    <>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="15.5" x2="13" y2="15.5" />
    </>
  ),
  // A board of cards.
  board: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <line x1="10" y1="4.5" x2="10" y2="19.5" />
      <line x1="10" y1="12" x2="20.5" y2="12" />
    </>
  ),
  // A play mark, for the three-minute run-through.
  rehearsal: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.5 8.75 16 12l-5.5 3.25z" />
    </>
  ),
  // Steps rising along a path.
  footprints: (
    <>
      <circle cx="6" cy="17.5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="6.5" r="2" />
    </>
  ),
};

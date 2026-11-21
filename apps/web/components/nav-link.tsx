'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { isActiveHref, type NavItem } from '@/lib/navigation';

type Props = {
  item: NavItem<string>;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
};

/**
 * A nav link that marks itself with `aria-current="page"`. Callers style the
 * active state with Tailwind's `aria-[current=page]:` variant, which also wins
 * on specificity, so there is no second source of truth for "is this active".
 * Client-side because it needs the current pathname; the label comes in already
 * translated.
 */
export function NavLink({ item, children, className, onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <Link
      href={item.href}
      aria-current={isActiveHref(pathname, item) ? 'page' : undefined}
      onClick={onNavigate}
      className={className}
    >
      {children}
    </Link>
  );
}

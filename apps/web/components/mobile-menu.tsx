'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { isSpacePath, primaryNav } from '@/lib/navigation';
import { NavLink } from './nav-link';

/**
 * The mobile nav for every screen outside 顯化空間 — there, the bottom tab bar
 * in app/space/layout.tsx takes over and this renders nothing.
 *
 * Keyboard behaviour: the toggle reports `aria-expanded`, Escape closes the
 * panel and returns focus to the toggle, opening moves focus to the first link,
 * and the panel closes on navigation or on a click outside.
 */
export function MobileMenu() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when the route changes, so the panel never outlives its page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Move focus into the panel once it opens.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (isSpacePath(pathname)) return null;

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t('closeMenu') : t('openMenu')}
        className="flex size-11 items-center justify-center rounded-md border border-line text-ink transition-colors hover:bg-paper-sunken"
      >
        <MenuIcon open={open} />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-30 border-b border-line bg-paper-2 shadow-sm"
      >
        <nav aria-label={t('primaryLabel')}>
          <ul className="mx-auto max-w-5xl px-4 py-2">
            {primaryNav.map((item) => (
              <li key={item.href} className="border-b border-line last:border-b-0">
                <NavLink
                  item={item}
                  onNavigate={() => setOpen(false)}
                  className="flex min-h-11 items-center py-2 text-ink aria-[current=page]:font-bold aria-[current=page]:text-blue-ink"
                >
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </>
      ) : (
        <>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </>
      )}
    </svg>
  );
}

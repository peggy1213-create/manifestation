'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { routes } from '@/lib/navigation';
import type { SessionUser } from '@/lib/session';

/**
 * 登入 when signed out, an avatar with a small menu when signed in.
 *
 * Keyboard behaviour mirrors the mobile menu: `aria-expanded` on the toggle,
 * Escape closes and returns focus, and opening focuses the first item.
 */
export function AccountNav({ user }: { user: SessionUser | null }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
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
      if (menuRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href={routes.login}
        className="flex min-h-11 items-center rounded-md bg-graph-blue px-4 text-[0.9375rem] font-bold text-white transition-opacity hover:opacity-90 dark:text-[#0b1222]"
      >
        {t('signIn')}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('accountMenu')}
        className="flex size-11 items-center justify-center rounded-full border border-line bg-paper-sunken"
      >
        <Avatar user={user} />
      </button>

      <div
        ref={menuRef}
        id={menuId}
        hidden={!open}
        className="absolute end-0 top-full z-10 mt-1 w-56 rounded-lg border border-line bg-paper-2 p-2 shadow-sm"
      >
        <p className="truncate px-2 py-1 text-[0.8125rem] text-ink-muted">{user.email}</p>
        <Link
          href={routes.space}
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center rounded-md px-2 text-ink hover:bg-paper-sunken"
        >
          {t('account')}
        </Link>
        {/* Becomes a POST to the sign-out route once auth lands (P04). */}
        <Link
          href={routes.login}
          onClick={() => setOpen(false)}
          className="flex min-h-11 items-center rounded-md px-2 text-ink hover:bg-paper-sunken"
        >
          {t('signOut')}
        </Link>
      </div>
    </div>
  );
}

/**
 * Initials, not the Google profile picture. Rendering the remote avatar would
 * make every signed-in page load fetch an image from Google's CDN, which is a
 * third-party request we do not want (private by default).
 */
function Avatar({ user }: { user: SessionUser }) {
  return (
    <span aria-hidden="true" className="text-[0.9375rem] font-bold text-ink">
      {[...user.name][0] ?? '?'}
    </span>
  );
}

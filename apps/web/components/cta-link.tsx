import Link from 'next/link';

/** The one primary action on a screen: coral, ink text, 44px tall. */
export function CtaLink({
  href,
  children,
  className = '',
}: Readonly<{ href: string; children: React.ReactNode; className?: string }>) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-notebook bg-coral px-6 py-3 text-base font-bold text-ink-on-accent shadow-[0_2px_0_0_var(--cp-ink)] transition-transform hover:-translate-y-0.5 ${className}`}
    >
      {children}
    </Link>
  );
}

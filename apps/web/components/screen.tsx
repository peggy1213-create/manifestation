import type { ReactNode } from 'react';

/**
 * The standard page body: a notebook column with a heading, a short intro, and
 * whatever the screen adds below. Used by every route except the home page,
 * which has its own layout.
 */
export function Screen({
  heading,
  intro,
  children,
}: {
  heading: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-[1.75rem] md:text-[2rem]">{heading}</h1>
      {intro ? <p className="mt-4 max-w-prose text-ink-muted">{intro}</p> : null}
      {children}
    </div>
  );
}

/** Honest placeholder for a screen whose contents land in a later phase. */
export function ComingSoon({ children }: { children: string }) {
  return (
    <p className="mt-8 max-w-prose rounded-lg border border-dashed border-line bg-paper-sunken px-4 py-6 text-[0.9375rem] text-ink-muted">
      {children}
    </p>
  );
}

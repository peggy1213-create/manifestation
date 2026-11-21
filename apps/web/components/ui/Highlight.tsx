import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface HighlightProps {
  children: ReactNode;
  className?: string;
}

/**
 * A highlighter swipe behind one phrase. The highlighter colour doesn't change with the
 * theme (CLAUDE.md), so the text on top stays the fixed `ink-on-accent` colour in both
 * light and dark mode rather than the themed `ink`.
 */
export function Highlight({ children, className }: HighlightProps) {
  return (
    // `isolate` + a non-negative z-index: a `-z-10` swipe would paint behind the
    // background of whatever card the phrase sits in, and disappear.
    <span className={cn('relative isolate inline-block whitespace-nowrap px-1', className)}>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-1.5 bottom-0.5 z-0 -skew-x-3 rounded-sm bg-highlighter"
      />
      <span className="relative z-10 text-ink-on-accent">{children}</span>
    </span>
  );
}

import type { ReactNode } from 'react';

/** A sheet of notebook paper: the one container the whole app writes on. */
export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`cp-sheet p-5 sm:p-7 ${className}`}>{children}</div>;
}

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-label font-bold text-ink/80">
      {children}
      {hint ? <span className="ml-2 font-normal text-ink/55">{hint}</span> : null}
    </label>
  );
}

export const inputClassName =
  'mt-1.5 w-full min-h-11 rounded-md border border-kraft/60 bg-paper px-3 py-2 text-body text-ink placeholder:text-ink/40 focus:border-terracotta-strong';

export const primaryButtonClassName =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-terracotta-strong px-5 py-2 text-body font-bold text-on-terracotta disabled:opacity-60';

export const secondaryButtonClassName =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-kraft bg-paper px-5 py-2 text-body text-ink disabled:opacity-60';

export const quietButtonClassName =
  'inline-flex min-h-11 items-center rounded-md px-2 py-1 text-small text-terracotta-strong underline decoration-kraft underline-offset-4';

/** The 66-day path motif, reused here as a step indicator. */
export function PathDots({ total, current }: { total: number; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <li
          key={index}
          className={`h-2.5 w-2.5 rounded-full ${
            index <= current ? 'bg-terracotta' : 'bg-kraft/40'
          }`}
        />
      ))}
    </ol>
  );
}

export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-kraft/70 bg-paper-2/60 px-3 py-1 text-label text-ink/75">
      {children}
    </span>
  );
}

import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({ label, id, className, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label htmlFor={checkboxId} className={cn('flex min-h-11 items-center gap-3', className)}>
      <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center">
        <input
          id={checkboxId}
          type="checkbox"
          className="peer h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-sm border-2 border-ink bg-paper checked:bg-graph-blue checked:border-graph-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-graph-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          {...props}
        />
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="pointer-events-none absolute h-3.5 w-3.5 scale-0 text-ink-on-accent peer-checked:scale-100"
        >
          <path
            d="M3 8.5L6.2 11.5L13 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-body text-ink">{label}</span>
    </label>
  );
}

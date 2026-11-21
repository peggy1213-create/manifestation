import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({
  label,
  hint,
  error,
  id,
  className,
  type = 'text',
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-body font-bold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        className={cn(
          'min-h-11 rounded-md border bg-paper px-3.5 text-body text-ink',
          'placeholder:text-ink/40 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-graph-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          error ? 'border-coral' : 'border-ink/25',
          className,
        )}
        aria-describedby={cn(hintId, errorId) || undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-caption text-ink/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption font-bold text-ink">
          {error}
        </p>
      )}
    </div>
  );
}

import { useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function TextArea({ label, hint, id, className, rows = 4, ...props }: TextAreaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = hint ? `${textareaId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={textareaId} className="text-body font-bold text-ink">
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={rows}
        className={cn(
          'rounded-md border border-ink/25 bg-paper px-3.5 py-3 text-body text-ink leading-relaxed',
          'placeholder:text-ink/40 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-graph-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          className,
        )}
        aria-describedby={hintId}
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-caption text-ink/70">
          {hint}
        </p>
      )}
    </div>
  );
}

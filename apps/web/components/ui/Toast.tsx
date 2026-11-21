import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ToastTone = 'neutral' | 'accent';

export interface ToastProps {
  tone?: ToastTone;
  message: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * A static, non-alarming notice card. Kind tracking means a missed-day message uses the
 * same quiet `neutral` tone as a success message — there is no "error" tone here.
 */
export function Toast({ tone = 'neutral', message, icon, className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'cp-shadow-card flex items-start gap-3 rounded-md bg-paper-2 py-3 pr-4 pl-4 text-body text-ink',
        tone === 'accent' && 'border-l-4 border-graph-blue',
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 text-graph-blue">{icon}</span>}
      <p>{message}</p>
    </div>
  );
}

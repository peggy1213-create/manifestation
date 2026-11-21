import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-6 text-center', className)}>
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-graph-blue">
          {icon}
        </span>
      )}
      <p className="text-heading font-bold text-ink">{title}</p>
      {description && <p className="max-w-xs text-body text-ink/70">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

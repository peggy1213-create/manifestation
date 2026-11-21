import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** A faint graph-paper grid background, behind whatever is passed as children. */
export function GraphPaper({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('cp-graph-paper', className)} {...props} />;
}

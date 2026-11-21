import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('cp-shadow-card rounded-lg bg-paper p-4', className)} {...props} />;
}

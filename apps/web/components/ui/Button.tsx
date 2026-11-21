import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-body font-bold ' +
  'transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-graph-blue ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-40';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:opacity-90 active:opacity-80',
  secondary: 'border border-ink text-ink bg-transparent hover:bg-paper-2 active:bg-paper-2',
  ghost: 'text-ink bg-transparent hover:bg-paper-2 active:bg-paper-2',
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

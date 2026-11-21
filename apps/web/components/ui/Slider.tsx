import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
}

export function Slider({ label, hint, id, className, ...props }: SliderProps) {
  const generatedId = useId();
  const sliderId = id ?? generatedId;
  const hintId = hint ? `${sliderId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={sliderId} className="text-body font-bold text-ink">
        {label}
      </label>
      <input
        id={sliderId}
        type="range"
        className={cn(
          'h-11 w-full cursor-pointer appearance-none bg-transparent',
          'focus-visible:outline-none',
          // Track
          '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-paper-2',
          '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-paper-2',
          // Thumb
          '[&::-webkit-slider-thumb]:mt-[-9px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-paper',
          '[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-paper',
          'focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-graph-blue',
          'focus-visible:[&::-moz-range-thumb]:ring-2 focus-visible:[&::-moz-range-thumb]:ring-graph-blue',
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

import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  label: string;
  name?: string;
  options: SegmentedControlOption[];
  defaultValue?: string;
  className?: string;
}

export function SegmentedControl({
  label,
  name,
  options,
  defaultValue,
  className,
}: SegmentedControlProps) {
  const generatedName = useId();
  const groupName = name ?? generatedName;

  return (
    <fieldset className={cn('flex flex-col gap-1.5', className)}>
      <legend className="text-body font-bold text-ink">{label}</legend>
      <div className="inline-flex rounded-full bg-paper-2 p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="relative flex-1 cursor-pointer rounded-full text-center"
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
            />
            <span
              className={cn(
                'block min-h-9 rounded-full px-4 py-2 text-caption font-bold text-ink',
                'peer-checked:bg-paper peer-checked:cp-shadow-card',
                'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-graph-blue peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper-2',
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

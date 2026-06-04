import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export interface SelectOption<T extends string | number | null> {
  value: T;
  label: string;
  /** Hex / Tailwind colour string for the swatch dot. Omit for no dot. */
  color?: string;
  description?: string;
}

interface SelectProps<T extends string | number | null> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Smaller padding for use inside table rows. */
  compact?: boolean;
  className?: string;
}

/**
 * Custom select with a coloured swatch per option. Native <select> can't render
 * a coloured dot inside <option>, so we render a button + popover list ourselves.
 * Keeps keyboard nav and click-outside-to-close behaviour.
 */
export function Select<T extends string | number | null>({
  value, options, onChange, placeholder = 'Choose…', disabled, compact, className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white text-left text-sm text-slate-900',
          'hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-2',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {current?.color && (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: current.color }} aria-hidden />
          )}
          <span className={clsx('truncate', !current && 'text-slate-400')}>
            {current?.label ?? placeholder}
          </span>
        </span>
        <ChevronIcon />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full min-w-[10rem] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={String(opt.value ?? '__null')}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={clsx(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800',
                  selected && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
                )}
              >
                {opt.color && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: opt.color }} aria-hidden />
                )}
                <span className="flex-1 truncate">{opt.label}</span>
                {selected && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

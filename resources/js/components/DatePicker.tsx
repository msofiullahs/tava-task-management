import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMonths, endOfMonth, format, isSameDay, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import clsx from 'clsx';
import { Button } from './Button';

interface DatePickerProps {
  /** ISO date YYYY-MM-DD or null. */
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
}

/** Spec §9.3 — visual date picker with human labels (Today, Tomorrow). No typed date strings. */
export function DatePicker({ value, onChange, placeholder = 'Set due date' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const selected = value ? parseISO(value) : null;
  const label = selected ? humanLabel(selected) : placeholder;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
          !selected && 'text-slate-500 dark:text-slate-400',
        )}
      >
        <CalendarIcon />
        <span>{label}</span>
        {selected && (
          <span
            role="button"
            aria-label="Clear"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(null); } }}
            className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            ×
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <CalendarPanel
            value={selected}
            onPick={(d) => { onChange(format(d, 'yyyy-MM-dd')); setOpen(false); }}
          />
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { onChange(null); setOpen(false); }}>Clear</Button>
            <Button size="sm" variant="ghost" onClick={() => { onChange(format(new Date(), 'yyyy-MM-dd')); setOpen(false); }}>Today</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function humanLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dn = new Date(d); dn.setHours(0, 0, 0, 0);
  if (isSameDay(dn, today)) return 'Today';
  if (isSameDay(dn, addDays(today, 1))) return 'Tomorrow';
  if (isSameDay(dn, addDays(today, -1))) return 'Yesterday';
  return format(d, 'MMM d');
}

interface CalendarPanelProps {
  value: Date | null;
  onPick: (d: Date) => void;
}

function CalendarPanel({ value, onPick }: CalendarPanelProps) {
  const [cursor, setCursor] = useState<Date>(() => value ?? new Date());
  const today = new Date();

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ‹
        </button>
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{format(cursor, 'MMMM yyyy')}</div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-wider text-slate-400">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const isSelected = value && isSameDay(d, value);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPick(d)}
              className={clsx(
                'h-8 rounded text-sm transition',
                inMonth ? 'text-slate-900 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600',
                isSelected
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : isToday
                  ? 'ring-1 ring-indigo-400'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="5" width="14" height="12" rx="1.5" />
      <path d="M7 3v4M13 3v4M3 9h14" strokeLinecap="round" />
    </svg>
  );
}

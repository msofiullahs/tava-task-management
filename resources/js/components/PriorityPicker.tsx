import clsx from 'clsx';
import { AlertTriangle, ArrowDown, ArrowUp, Flame, Minus } from 'lucide-react';
import { Select, type SelectOption } from './Select';
import { PRIORITY_DOT, PRIORITY_LABELS, type Priority } from '../types';

interface PriorityPickerProps {
  value: Priority | null;
  onChange: (next: Priority | null) => void;
  compact?: boolean;
}

const OPTIONS: SelectOption<Priority | null>[] = [
  { value: null, label: 'No priority' },
  { value: 'low', label: PRIORITY_LABELS.low, color: PRIORITY_DOT.low },
  { value: 'normal', label: PRIORITY_LABELS.normal, color: PRIORITY_DOT.normal },
  { value: 'high', label: PRIORITY_LABELS.high, color: PRIORITY_DOT.high },
  { value: 'urgent', label: PRIORITY_LABELS.urgent, color: PRIORITY_DOT.urgent },
];

/** Spec §9.3 — labelled coloured dropdown. Colour dots now show in the options list, not just text. */
export function PriorityPicker({ value, onChange, compact }: PriorityPickerProps) {
  return (
    <Select<Priority | null>
      value={value}
      options={OPTIONS}
      onChange={onChange}
      placeholder="No priority"
      compact={compact}
    />
  );
}

/** Per-priority icon — Lucide. Wraps in a uniformly-coloured pill so the meaning is parseable at a glance. */
const PRIORITY_ICON = {
  urgent: Flame,
  high: AlertTriangle,
  normal: ArrowUp,
  low: ArrowDown,
} as const;

/** Background + text combo per priority — semantic colours, not slate-grey blandness. */
const PRIORITY_BADGE_CLASSES: Record<Priority, string> = {
  urgent: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/50',
  high: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/50',
  normal: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800/50',
  low: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
};

export function PriorityBadge({ value, compact }: { value: Priority | null; compact?: boolean }) {
  if (!value) {
    if (compact) return null;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:ring-slate-700">
        <Minus className="h-3 w-3" />
        None
      </span>
    );
  }
  const Icon = PRIORITY_ICON[value];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        PRIORITY_BADGE_CLASSES[value],
      )}
    >
      <Icon className="h-3 w-3" />
      {PRIORITY_LABELS[value]}
    </span>
  );
}

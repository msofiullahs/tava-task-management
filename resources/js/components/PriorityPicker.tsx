import clsx from 'clsx';
import { PRIORITY_COLORS, PRIORITY_LABELS, type Priority } from '../types';

interface PriorityPickerProps {
  value: Priority | null;
  onChange: (next: Priority | null) => void;
}

const OPTIONS: (Priority | null)[] = [null, 'low', 'normal', 'high', 'urgent'];

/** Spec §9.3 — labelled coloured dropdown. The label is always present alongside the color (§9.9). */
export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || null) as Priority | null)}
      className={clsx(
        'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700',
        'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
      )}
    >
      {OPTIONS.map((opt) => (
        <option key={opt ?? 'none'} value={opt ?? ''}>
          {opt ? `● ${PRIORITY_LABELS[opt]}` : 'No priority'}
        </option>
      ))}
    </select>
  );
}

export function PriorityBadge({ value }: { value: Priority | null }) {
  if (!value) return null;
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_COLORS[value])}>
      {PRIORITY_LABELS[value]}
    </span>
  );
}

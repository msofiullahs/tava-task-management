import clsx from 'clsx';
import { Select, type SelectOption } from './Select';
import { PRIORITY_COLORS, PRIORITY_DOT, PRIORITY_LABELS, type Priority } from '../types';

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

export function PriorityBadge({ value }: { value: Priority | null }) {
  if (!value) return null;
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_COLORS[value])}>
      {PRIORITY_LABELS[value]}
    </span>
  );
}

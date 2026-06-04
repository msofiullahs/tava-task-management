import { Select } from './Select';
import type { Status } from '../types';

interface StatusSelectProps {
  value: number | undefined;
  statuses: Status[];
  onChange: (statusId: number) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

/** Status dropdown that shows the column colour next to each option. */
export function StatusSelect({ value, statuses, onChange, disabled, compact, className }: StatusSelectProps) {
  return (
    <Select<number>
      value={value as number}
      options={statuses.map((s) => ({ value: s.id, label: s.name, color: s.color }))}
      onChange={onChange}
      disabled={disabled}
      compact={compact}
      className={className}
    />
  );
}

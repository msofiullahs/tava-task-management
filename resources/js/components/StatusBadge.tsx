import clsx from 'clsx';
import type { Status } from '../types';

/** Always pairs the colour with the status name — spec §9.9 (no colour-only meaning). */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-sm', className)}>
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: status.color }} />
      <span className="text-slate-700 dark:text-slate-200">{status.name}</span>
    </span>
  );
}

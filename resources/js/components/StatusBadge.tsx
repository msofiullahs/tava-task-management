import clsx from 'clsx';
import type { Status } from '../types';

interface StatusBadgeProps {
  status: Status;
  className?: string;
  /** "dot" = colour dot + name (default). "pill" = subtle background tinted by status colour. */
  variant?: 'dot' | 'pill';
}

/**
 * Always pairs the colour with the status name — spec §9.9 (no colour-only meaning).
 * "pill" variant tints the background with the same colour at low alpha so the badge
 * has more visual weight in dense tables / boards.
 */
export function StatusBadge({ status, className, variant = 'dot' }: StatusBadgeProps) {
  if (variant === 'pill') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
          className,
        )}
        style={{
          background: `${status.color}1f`, // ~12% alpha
          color: status.color,
          boxShadow: `inset 0 0 0 1px ${status.color}4d`,
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} aria-hidden />
        {status.name}
      </span>
    );
  }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-sm', className)}>
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: status.color }} />
      <span className="text-slate-700 dark:text-slate-200">{status.name}</span>
    </span>
  );
}

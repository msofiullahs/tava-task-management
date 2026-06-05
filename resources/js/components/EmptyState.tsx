import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Pass any Lucide icon component. Falls back to `Inbox`. */
  icon?: LucideIcon;
  className?: string;
  /** "md" = page-level empty (default). "sm" = inline empty for nested sections. */
  size?: 'md' | 'sm';
}

/** Spec §9.1 — every empty view shows one sentence of plain guidance and a single primary button. */
export function EmptyState({
  title, description, action, icon: Icon = Inbox, className, size = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 text-center dark:border-slate-700',
        size === 'md' ? 'px-6 py-12' : 'px-4 py-6',
        className,
      )}
    >
      <span className={clsx(
        'flex items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
        size === 'md' ? 'h-12 w-12' : 'h-9 w-9',
      )}>
        <Icon className={size === 'md' ? 'h-6 w-6' : 'h-4 w-4'} />
      </span>
      <h3 className={clsx(
        'font-semibold text-slate-900 dark:text-slate-100',
        size === 'md' ? 'text-base' : 'text-sm',
      )}>
        {title}
      </h3>
      {description && (
        <p className={clsx(
          'max-w-md text-slate-500 dark:text-slate-400',
          size === 'md' ? 'text-sm' : 'text-xs',
        )}>
          {description}
        </p>
      )}
      {action && <div className={size === 'md' ? 'mt-2' : 'mt-1'}>{action}</div>}
    </div>
  );
}

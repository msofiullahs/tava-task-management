import clsx from 'clsx';

/**
 * Pulsing placeholder shape — drop-in replacement for "Loading…" text while
 * server data is pending. Composable: stack a few `<Skeleton h="h-4" />` to
 * mimic rows, or pass children for layout.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800/70',
        className,
      )}
      aria-hidden
    />
  );
}

/** Convenience: stack of N rows that fakes a list. */
export function SkeletonRows({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

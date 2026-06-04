import clsx from 'clsx';
import { useState } from 'react';

interface AvatarProps {
  name: string;
  /** Auth-checked avatar URL (with cache-buster). Falls back to the letter bubble when null/undefined or on load error. */
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

/** Letter-bubble avatar that shows an uploaded image when available. */
export function Avatar({ name, src, size = 'sm', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeClasses = SIZES[size];

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        title={name}
        onError={() => setFailed(true)}
        className={clsx(
          'inline-block shrink-0 rounded-full object-cover ring-1 ring-white dark:ring-slate-900',
          sizeClasses,
          className,
        )}
      />
    );
  }

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
  const hue = Array.from(name).reduce((a, c) => (a + c.charCodeAt(0)) % 360, 0);

  return (
    <span
      title={name}
      aria-label={name}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white dark:ring-slate-900',
        sizeClasses,
        className,
      )}
      style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }}
    >
      {initials}
    </span>
  );
}

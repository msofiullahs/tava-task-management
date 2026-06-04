import clsx from 'clsx';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/** Letter-bubble avatars — emails are out (spec §9.3, §12). */
export function Avatar({ name, size = 'sm', className }: AvatarProps) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

  const sizes = {
    xs: 'h-5 w-5 text-[10px]',
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
  }[size];

  // Stable color from the name hash — gives each person a consistent bubble.
  const hue = Array.from(name).reduce((a, c) => (a + c.charCodeAt(0)) % 360, 0);

  return (
    <span
      title={name}
      aria-label={name}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white dark:ring-slate-900',
        sizes,
        className,
      )}
      style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }}
    >
      {initials}
    </span>
  );
}

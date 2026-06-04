import clsx from 'clsx';

interface LogoProps {
  className?: string;
  /** When true, renders the gradient-on-square brand mark. When false, a single-colour glyph that inherits `currentColor`. */
  filled?: boolean;
}

/**
 * Tava brand mark — geometric "T" formed by two rounded pills.
 * Stays a fixed square; pair with a sibling text node for the wordmark.
 */
export function Logo({ className, filled = true }: LogoProps) {
  if (filled) {
    return (
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        aria-label="Tava"
        className={clsx('shrink-0', className)}
      >
        <rect width="32" height="32" rx="8" fill="url(#tavaGrad)" />
        <rect x="6" y="8.5" width="20" height="4.5" rx="2.25" fill="#fff" />
        <rect x="13.75" y="8.5" width="4.5" height="16.5" rx="2.25" fill="#fff" />
        <circle cx="23.25" cy="10.75" r="1.25" fill="#a5b4fc" />
        <defs>
          <linearGradient id="tavaGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#818cf8" />
            <stop offset="1" stopColor="#4338ca" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-label="Tava"
      className={clsx('shrink-0', className)}
    >
      <rect x="6" y="8.5" width="20" height="4.5" rx="2.25" />
      <rect x="13.75" y="8.5" width="4.5" height="16.5" rx="2.25" />
    </svg>
  );
}

/** Mark + wordmark together — drop into sign-in screens and the app sidebar. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <Logo className="h-7 w-7" />
      <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Tava</span>
    </span>
  );
}

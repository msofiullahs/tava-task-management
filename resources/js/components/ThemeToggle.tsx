import { useTheme } from '../lib/theme';
import { useUpdatePreferences } from '../api/auth';
import clsx from 'clsx';

const ORDER = ['light', 'dark', 'system'] as const;

/** Spec §9.11 — visible toggle in the top bar. Cycles light → dark → system → light. */
export function ThemeToggle() {
  const { theme, effective, setTheme } = useTheme();
  const persist = useUpdatePreferences();

  const next = () => {
    const i = ORDER.indexOf(theme);
    const n = ORDER[(i + 1) % ORDER.length];
    setTheme(n);
    persist.mutate({ theme: n }); // fire-and-forget mirror to the server (spec §9.11)
  };

  const Icon = () => {
    if (theme === 'system') return <SystemIcon />;
    return effective === 'dark' ? <MoonIcon /> : <SunIcon />;
  };

  const labels = { light: 'Light', dark: 'Dark', system: 'System' };

  return (
    <button
      type="button"
      onClick={next}
      title={`Theme: ${labels[theme]} — click to switch`}
      aria-label={`Switch theme (currently ${labels[theme]})`}
      className={clsx(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        'dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
      )}
    >
      <Icon />
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M10 14a4 4 0 100-8 4 4 0 000 8zM10 2v2m0 12v2m8-8h-2M4 10H2m13.66-5.66l-1.41 1.41M5.75 14.25l-1.41 1.41m0-11.32l1.41 1.41m8.49 8.49l1.41 1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M15.5 12.5A6.5 6.5 0 017.5 4.5a6.5 6.5 0 108 8z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="14" height="10" rx="1.5" />
      <path d="M7 17h6M10 14v3" strokeLinecap="round" />
    </svg>
  );
}

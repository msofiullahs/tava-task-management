import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

/**
 * Password input with a built-in show/hide toggle.
 *
 * Shares its visual style with TextField but owns the input markup so the eye
 * button can sit absolutely inside the field bounds. Defaults to obscured;
 * caller doesn't need to manage the visibility state.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, hint, error, required, className, ...rest },
  ref,
) {
  const [shown, setShown] = useState(false);

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label} {required && <span className="text-rose-600" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={shown ? 'text' : 'password'}
          required={required}
          className={clsx(
            'w-full rounded-md border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm text-slate-900 placeholder-slate-400',
            'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500',
          )}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          // Skip the tab order — the eye is a convenience, not a primary control.
          tabIndex={-1}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          className={clsx(
            'absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition',
            'hover:text-slate-700 focus:text-slate-700 focus:outline-none',
            'dark:hover:text-slate-200 dark:focus:text-slate-200',
          )}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error
        ? <p className="mt-1 text-xs text-rose-600">{error}</p>
        : hint
          ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          : null}
    </div>
  );
});

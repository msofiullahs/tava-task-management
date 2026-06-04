import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

const inputClasses = clsx(
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400',
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
  'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500',
);

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

function FieldLabel({ label, required }: { label?: string; required?: boolean }) {
  if (!label) return null;
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label} {required && <span className="text-rose-600" aria-hidden>*</span>}
    </label>
  );
}

function FieldHint({ hint, error }: { hint?: string; error?: string }) {
  if (error) return <p className="mt-1 text-xs text-rose-600">{error}</p>;
  if (hint) return <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>;
  return null;
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement>, FieldWrapperProps {}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, required, className, ...rest },
  ref,
) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} />
      <input ref={ref} required={required} className={inputClasses} {...rest} />
      <FieldHint hint={hint} error={error} />
    </div>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldWrapperProps {}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, required, className, rows = 4, ...rest },
  ref,
) {
  return (
    <div className={className}>
      <FieldLabel label={label} required={required} />
      <textarea ref={ref} rows={rows} required={required} className={inputClasses} {...rest} />
      <FieldHint hint={hint} error={error} />
    </div>
  );
});

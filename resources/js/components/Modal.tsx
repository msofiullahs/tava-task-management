import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Spec §9.7 — modals become full-screen sheets on small screens. */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  // Two-stage state: mount with shown=false, then flip true next frame so the CSS
  // transition runs from the off → on state (fade in + subtle scale).
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const id = requestAnimationFrame(() => setShown(true));
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <div
        className={clsx(
          'absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-150',
          shown ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={clsx(
          'relative flex max-h-[95vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200/50 transition-all duration-150',
          'sm:rounded-2xl dark:bg-slate-900 dark:ring-slate-800/50',
          sizeClasses[size],
          shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0',
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

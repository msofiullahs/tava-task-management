import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

interface ToastEntry {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
  /** ms — defaults to 4_000 for plain toasts, 7_000 for undo (spec §9.4). */
  duration?: number;
}

interface ToastContextValue {
  toast: (entry: Omit<ToastEntry, 'id'>) => void;
  undoToast: (message: string, onUndo: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const toast = useCallback((entry: Omit<ToastEntry, 'id'>) => {
    const id = ++counter.current;
    const e = { ...entry, id };
    setEntries((prev) => [...prev, e]);
    const ms = entry.duration ?? (entry.action ? 7_000 : 4_000);
    setTimeout(() => remove(id), ms);
  }, [remove]);

  const undoToast = useCallback((message: string, onUndo: () => void) => {
    toast({ message, tone: 'info', action: { label: 'Undo', onClick: onUndo }, duration: 7_000 });
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, undoToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {entries.map((e) => (
          <ToastItem key={e.id} entry={e} onClose={() => remove(e.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ entry, onClose }: { entry: ToastEntry; onClose: () => void }) {
  const colors = {
    info: 'bg-slate-900 text-slate-50 dark:bg-slate-800',
    success: 'bg-emerald-700 text-white',
    error: 'bg-rose-700 text-white',
  }[entry.tone];

  return (
    <div
      role="status"
      className={clsx(
        'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-lg',
        colors,
      )}
    >
      <span className="flex-1">{entry.message}</span>
      {entry.action && (
        <button
          type="button"
          onClick={() => { entry.action!.onClick(); onClose(); }}
          className="rounded px-2 py-1 text-sm font-medium underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          {entry.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="rounded p-1 text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        ×
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/** No-op effect helper that warns once if the context is missing (used by hooks below the tree). */
export function useToastSafe(): ToastContextValue {
  const ctx = useContext(ToastContext);
  useEffect(() => {
    if (!ctx) console.warn('useToastSafe: no ToastProvider in tree');
  }, [ctx]);
  return ctx ?? { toast: () => {}, undoToast: () => {} };
}

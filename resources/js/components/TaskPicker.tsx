import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTasks } from '../api/tasks';
import type { ProjectKey } from '../api/projects';
import type { Task } from '../types';

interface TaskPickerProps {
  /** Project to search within. The picker shows non-trashed tasks the viewer can see. */
  projectKey: ProjectKey;
  /** Hide these IDs from the result (typically the current task + any already-linked ones). */
  excludeIds?: number[];
  /** Selection callback. */
  onPick: (task: Task) => void;
  placeholder?: string;
}

/**
 * Type-to-search task chooser. Single-project for now — links across projects
 * are intentionally restricted to keep visibility logic predictable.
 */
export function TaskPicker({ projectKey, excludeIds = [], onPick, placeholder = 'Search this project…' }: TaskPickerProps) {
  const { data: tasks = [] } = useTasks(projectKey);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => !excludeIds.includes(t.id))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) : true))
      .slice(0, 20);
  }, [tasks, query, excludeIds]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={clsx(
          'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400',
          'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500',
        )}
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {filtered.length === 0 && (
            <div className="px-3 py-3 text-sm text-slate-500">No matching tasks.</div>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onPick(t); setQuery(''); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="flex-1 truncate text-slate-900 dark:text-slate-100">{t.title}</span>
              {t.parent && (
                <span className="text-xs text-slate-400" title={`Subtask of ${t.parent.title}`}>↳</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

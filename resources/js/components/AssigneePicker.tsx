import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useUsers } from '../api/users';
import { Avatar } from './Avatar';

interface AssigneePickerProps {
  selected: number[];
  onChange: (ids: number[]) => void;
}

/** Spec §9.3 — avatar + type-to-search-by-name. Never IDs or emails typed by hand. */
export function AssigneePicker({ selected, onChange }: AssigneePickerProps) {
  const { data: users = [] } = useUsers();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
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
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, query]);

  const picked = users.filter((u) => selected.includes(u.id));

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex min-h-9 w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-left text-sm hover:bg-slate-50',
          'dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
        )}
      >
        {picked.length === 0 ? (
          <span className="text-slate-500 dark:text-slate-400">Assign to…</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {picked.map((u) => <Avatar key={u.id} name={u.name} src={u.avatar_url} size="xs" />)}
            <span className="ml-1 text-slate-700 dark:text-slate-200">
              {picked.length === 1 ? picked[0].name : `${picked.length} people`}
            </span>
          </div>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full border-b border-slate-200 px-3 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-500">No people match.</div>
            )}
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Avatar name={u.name} src={u.avatar_url} size="sm" />
                <span className="flex-1 text-left text-slate-900 dark:text-slate-100">{u.name}</span>
                {selected.includes(u.id) && <span className="text-indigo-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

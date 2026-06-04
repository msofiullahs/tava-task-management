import { useMemo, useState } from 'react';
import {
  addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import clsx from 'clsx';
import type { Task } from '../types';
import { EmptyState } from '../components/EmptyState';

interface CalendarViewProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
}

/** Spec §8 — month grid by due_date with an "Unscheduled" tray for null dates. */
export function CalendarView({ tasks, onOpenTask }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const today = new Date();

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const scheduled = tasks.filter((t) => !!t.due_date);
  const unscheduled = tasks.filter((t) => !t.due_date);

  const dayMap = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of scheduled) {
      const k = t.due_date!;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [scheduled]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:flex-row lg:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
          <button type="button" onClick={() => setCursor((c) => addMonths(c, -1))} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Previous month">‹</button>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{format(cursor, 'MMMM yyyy')}</h2>
          <button type="button" onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Next month">›</button>
        </header>
        <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800">
          {grid.map((d) => {
            const dayTasks = dayMap.get(format(d, 'yyyy-MM-dd')) ?? [];
            const inMonth = isSameMonth(d, cursor);
            const isToday = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className={clsx(
                  'flex min-h-[88px] flex-col gap-1 bg-white p-1 dark:bg-slate-900',
                  !inMonth && 'opacity-50',
                )}
              >
                <div className={clsx(
                  'self-end text-xs',
                  isToday
                    ? 'flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white'
                    : 'text-slate-500',
                )}>
                  {d.getDate()}
                </div>
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenTask(t)}
                    className="truncate rounded bg-indigo-50 px-1.5 py-0.5 text-left text-xs text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300"
                  >
                    {t.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-xs text-slate-400">+{dayTasks.length - 3} more</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="w-full shrink-0 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:w-72">
        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Unscheduled</h3>
        {unscheduled.length === 0 ? (
          <EmptyState title="Nothing unscheduled" description="Tasks without a due date will show up here." className="border-none p-0 py-6" />
        ) : (
          <ul className="space-y-1">
            {unscheduled.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask(t)}
                  className="w-full truncate rounded px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

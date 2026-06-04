import { useMemo, useState, type KeyboardEvent } from 'react';
import { useCreateTask, useUpdateTask } from '../api/tasks';
import { useCurrentUser } from '../api/auth';
import { humanError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { Avatar } from '../components/Avatar';
import { PriorityBadge } from '../components/PriorityPicker';
import { EmptyState } from '../components/EmptyState';
import type { Status, Task } from '../types';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

interface ListViewProps {
  projectId: number;
  statuses: Status[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
}

/** Spec §8 — table grouped by status. Group header = status + count. Inline status dropdown per row. */
export function ListView({ projectId, statuses, tasks, onOpenTask }: ListViewProps) {
  const groups = useMemo(() => {
    const byStatus = new Map<number, Task[]>();
    statuses.forEach((s) => byStatus.set(s.id, []));
    tasks.forEach((t) => {
      if (!byStatus.has(t.status_id)) byStatus.set(t.status_id, []);
      byStatus.get(t.status_id)!.push(t);
    });
    return statuses.map((s) => ({ status: s, items: byStatus.get(s.id) ?? [] }));
  }, [statuses, tasks]);

  if (statuses.length === 0) {
    return (
      <EmptyState
        title="No statuses yet"
        description="Add a status to start tracking tasks."
      />
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {groups.map(({ status, items }) => (
        <Group
          key={status.id}
          projectId={projectId}
          status={status}
          statuses={statuses}
          tasks={items}
          onOpenTask={onOpenTask}
        />
      ))}
    </div>
  );
}

interface GroupProps {
  projectId: number;
  status: Status;
  statuses: Status[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
}

function Group({ projectId, status, statuses, tasks, onOpenTask }: GroupProps) {
  const { data: user } = useCurrentUser();
  const create = useCreateTask(projectId);
  const update = useUpdateTask(projectId);
  const { toast } = useToast();
  const canEdit = user && user.role !== 'guest';
  const [quickTitle, setQuickTitle] = useState('');

  const onQuickAdd = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !quickTitle.trim()) return;
    const title = quickTitle.trim();
    setQuickTitle('');
    create.mutate({ title, status_id: status.id }, {
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  return (
    <section>
      <header className="flex items-center gap-2 pb-2">
        <span className="h-3 w-3 rounded-full" style={{ background: status.color }} aria-hidden />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{status.name}</h2>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {tasks.length}
        </span>
      </header>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-3 py-2 font-medium">Task</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Status</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Priority</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">Due</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Assignees</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr
                key={t.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                onClick={() => onOpenTask(t)}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 dark:text-slate-100">{t.title}</span>
                    {typeof t.comment_count === 'number' && t.comment_count > 0 && (
                      <span className="text-xs text-slate-400">💬 {t.comment_count}</span>
                    )}
                  </div>
                </td>
                <td className="hidden px-3 py-2 md:table-cell" onClick={(e) => e.stopPropagation()}>
                  <select
                    disabled={!canEdit}
                    value={t.status_id}
                    onChange={(e) => update.mutate({ id: t.id, status_id: Number(e.target.value) })}
                    className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-700 hover:border-slate-300 dark:text-slate-200 dark:hover:border-slate-700"
                  >
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>
                <td className="hidden px-3 py-2 md:table-cell"><PriorityBadge value={t.priority} /></td>
                <td className={clsx('hidden px-3 py-2 text-xs lg:table-cell', isOverdue(t.due_date) ? 'text-rose-600' : 'text-slate-500')}>
                  {t.due_date ? format(parseISO(t.due_date), 'MMM d') : '—'}
                </td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <div className="flex -space-x-1">
                    {(t.assignees ?? []).slice(0, 3).map((a) => <Avatar key={a.id} name={a.name} size="xs" />)}
                  </div>
                </td>
              </tr>
            ))}
            {canEdit && (
              <tr className="border-t border-slate-100 dark:border-slate-800">
                <td colSpan={5} className="px-3 py-2">
                  <input
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={onQuickAdd}
                    placeholder="+ Add a task…"
                    className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none dark:text-slate-200"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return parseISO(date) < today;
}

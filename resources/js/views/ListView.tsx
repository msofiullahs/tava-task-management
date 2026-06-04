import { useMemo } from 'react';
import { useUpdateTask } from '../api/tasks';
import { useCurrentUser } from '../api/auth';
import { Avatar } from '../components/Avatar';
import { PriorityBadge } from '../components/PriorityPicker';
import { StatusSelect } from '../components/StatusSelect';
import { EmptyState } from '../components/EmptyState';
import type { Status, Task } from '../types';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

interface ListViewProps {
  projectKey: string;
  statuses: Status[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  /** When provided, the per-group "+ Add a task" button fires this with the group's status id. */
  onAddInStatus?: (statusId: number) => void;
}

/** Spec §8 — table grouped by status. Group header = status + count. Inline status dropdown per row. */
export function ListView({ projectKey, statuses, tasks, onOpenTask, onAddInStatus }: ListViewProps) {
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
    // ProjectPage clips its view container with overflow-hidden (Board needs horizontal-only
    // scroll). List + Calendar opt into vertical scroll themselves so the chain doesn't bubble.
    <div className="h-full space-y-6 overflow-y-auto p-4 lg:p-6">
      {groups.map(({ status, items }) => (
        <Group
          key={status.id}
          projectKey={projectKey}
          status={status}
          statuses={statuses}
          tasks={items}
          onOpenTask={onOpenTask}
          onAddTask={onAddInStatus}
        />
      ))}
    </div>
  );
}

interface GroupProps {
  projectKey: string;
  status: Status;
  statuses: Status[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onAddTask?: (statusId: number) => void;
}

function Group({ projectKey, status, statuses, tasks, onOpenTask, onAddTask }: GroupProps) {
  const { data: user } = useCurrentUser();
  const update = useUpdateTask(projectKey);
  const canEdit = user && user.role !== 'guest';

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
                    {t.parent && (
                      <span aria-hidden className="text-xs text-slate-400" title={`Subtask of "${t.parent.title}"`}>↳</span>
                    )}
                    <span className="text-slate-900 dark:text-slate-100">{t.title}</span>
                    {typeof t.subtask_count === 'number' && t.subtask_count > 0 && (
                      <span className="text-xs text-slate-400" title={`${t.subtask_count} subtask${t.subtask_count === 1 ? '' : 's'}`}>
                        ☰ {t.subtask_count}
                      </span>
                    )}
                    {typeof t.comment_count === 'number' && t.comment_count > 0 && (
                      <span className="text-xs text-slate-400">💬 {t.comment_count}</span>
                    )}
                  </div>
                </td>
                <td className="hidden px-3 py-2 md:table-cell" onClick={(e) => e.stopPropagation()}>
                  <StatusSelect
                    value={t.status_id}
                    statuses={statuses}
                    disabled={!canEdit}
                    compact
                    onChange={(statusId) => update.mutate({ id: t.id, status_id: statusId })}
                    className="w-36"
                  />
                </td>
                <td className="hidden px-3 py-2 md:table-cell"><PriorityBadge value={t.priority} /></td>
                <td className={clsx('hidden px-3 py-2 text-xs lg:table-cell', isOverdue(t.due_date) ? 'text-rose-600' : 'text-slate-500')}>
                  {t.due_date ? format(parseISO(t.due_date), 'MMM d') : '—'}
                </td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <div className="flex -space-x-1">
                    {(t.assignees ?? []).slice(0, 3).map((a) => <Avatar key={a.id} name={a.name} src={a.avatar_url} size="xs" />)}
                  </div>
                </td>
              </tr>
            ))}
            {canEdit && onAddTask && (
              <tr className="border-t border-slate-100 dark:border-slate-800">
                <td colSpan={5} className="p-0">
                  <button
                    type="button"
                    onClick={() => onAddTask(status.id)}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    <span aria-hidden className="text-base leading-none">+</span> Add a task
                  </button>
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

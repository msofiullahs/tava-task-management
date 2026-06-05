import { useMemo, useState, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { ListTree } from 'lucide-react';
import { useTasks } from '../api/tasks';
import { useCreateSubtask } from '../api/links';
import { useToast } from '../lib/toast';
import { humanError } from '../lib/errors';
import type { Status, Task } from '../types';

interface SubtasksSectionProps {
  task: Task;
  statuses: Status[];
  onOpenSubtask: (taskId: number) => void;
  readOnly: boolean;
}

/**
 * Lists direct children of the task. Subtasks are loaded from the same
 * project-wide tasks query — we just filter client-side instead of issuing
 * a second request. This keeps the cache simple and live (drag-drop in the
 * board updates the subtask list here too).
 */
export function SubtasksSection({ task, statuses, onOpenSubtask, readOnly }: SubtasksSectionProps) {
  const { data: allTasks = [] } = useTasks(task.project_uuid);
  const create = useCreateSubtask(task.project_uuid, task.id);
  const { toast } = useToast();
  const [title, setTitle] = useState('');

  const children = useMemo(
    () => allTasks.filter((t) => t.parent_id === task.id),
    [allTasks, task.id],
  );

  const statusById = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

  // Quick stats for the header — "2 of 5 done" if there's a status named Done.
  const doneStatusIds = useMemo(
    () => new Set(statuses.filter((s) => /^done$|complete/i.test(s.name)).map((s) => s.id)),
    [statuses],
  );
  const doneCount = children.filter((c) => doneStatusIds.has(c.status_id)).length;

  const onAdd = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !title.trim()) return;
    const t = title.trim();
    setTitle('');
    create.mutate({ title: t }, {
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <ListTree className="h-4 w-4 text-slate-400" /> Subtasks
          {children.length > 0 && (
            <span className="text-xs font-normal text-slate-400">
              {doneCount}/{children.length} done
            </span>
          )}
        </h3>
      </div>

      {children.length === 0 ? (
        <p className="text-sm text-slate-500">No subtasks yet.</p>
      ) : (
        <ul className="space-y-1">
          {children.map((c) => {
            const status = statusById.get(c.status_id);
            const isDone = doneStatusIds.has(c.status_id);
            return (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700"
              >
                {status && (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: status.color }} aria-hidden />
                )}
                <button
                  type="button"
                  onClick={() => onOpenSubtask(c.id)}
                  className={clsx(
                    'flex-1 truncate text-left',
                    isDone
                      ? 'text-slate-400 line-through hover:text-indigo-500 dark:text-slate-500'
                      : 'text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-300',
                  )}
                >
                  {c.title}
                </button>
                {status && <span className="text-xs text-slate-400">{status.name}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onAdd}
          placeholder="+ Add a subtask…"
          className={clsx(
            'mt-2 w-full rounded-md border border-dashed border-slate-300 bg-transparent px-2 py-1.5 text-sm placeholder-slate-400 outline-none',
            'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
            'dark:border-slate-700 dark:text-slate-200',
          )}
        />
      )}
    </section>
  );
}

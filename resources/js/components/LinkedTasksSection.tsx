import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link2, Plus, X } from 'lucide-react';
import { useCreateTaskLink, useDeleteTaskLink, useTaskLinks } from '../api/links';
import { TaskPicker } from './TaskPicker';
import { Button } from './Button';
import { useToast } from '../lib/toast';
import { humanError } from '../lib/errors';
import type { Task, TaskLink, TaskLinkType } from '../types';
import { LINK_LABELS } from '../types';

interface LinkedTasksSectionProps {
  task: Task;
  /** Selecting a linked task opens it — passed up to ProjectPage. */
  onOpenLinkedTask: (taskId: number) => void;
  /** Disable add/remove when the viewer can't edit. */
  readOnly: boolean;
}

/** UI dropdown labels for the relationship to create. The picker explicitly
 *  surfaces inverse options like "Blocked by" — those get translated into a
 *  POST against the OTHER task with type='blocks'. */
type PickerKind = 'relates_to' | 'blocks' | 'blocked_by' | 'duplicates' | 'duplicated_by';

const PICKER_OPTIONS: { value: PickerKind; label: string }[] = [
  { value: 'relates_to', label: 'Related to' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'blocked_by', label: 'Blocked by' },
  { value: 'duplicates', label: 'Duplicates' },
  { value: 'duplicated_by', label: 'Duplicated by' },
];

export function LinkedTasksSection({ task, onOpenLinkedTask, readOnly }: LinkedTasksSectionProps) {
  const { data: links = [] } = useTaskLinks(task.id);
  const createLink = useCreateTaskLink(task.project_uuid);
  const deleteLink = useDeleteTaskLink(task.id, task.project_uuid);
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<PickerKind>('relates_to');

  /** Group links by their UI label so we render "Blocks: A, B" / "Blocked by: C". */
  const groups = useMemo(() => {
    const map = new Map<string, TaskLink[]>();
    for (const link of links) {
      const label = LINK_LABELS[`${link.type}:${link.direction}`] ?? 'Linked';
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(link);
    }
    return Array.from(map.entries());
  }, [links]);

  const excludeIds = useMemo(
    () => [task.id, ...links.map((l) => l.task.id)],
    [task.id, links],
  );

  const onPick = (other: Task) => {
    // Translate the UI option into (sourceTaskId, type) — for inverse picks
    // the OTHER task is the source.
    const { sourceTaskId, target_task_id, type } = directionFromPickerKind(kind, task.id, other.id);
    createLink.mutate(
      { taskId: sourceTaskId, target_task_id, type },
      {
        onSuccess: () => { toast({ message: 'Linked.', tone: 'success' }); setAdding(false); },
        onError: (err) => toast({ message: humanError(err), tone: 'error' }),
      },
    );
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Link2 className="h-4 w-4 text-slate-400" /> Linked tasks
        </h3>
        {!readOnly && (
          <Button size="sm" variant="ghost" onClick={() => setAdding((o) => !o)}>
            {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {adding ? 'Cancel' : 'Add link'}
          </Button>
        )}
      </div>

      {adding && !readOnly && (
        <div className="mb-3 space-y-2 rounded-md border border-slate-200 p-2 dark:border-slate-700">
          <div className="flex gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as PickerKind)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {PICKER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <TaskPicker
              projectKey={task.project_uuid}
              excludeIds={excludeIds}
              onPick={onPick}
              placeholder="Pick a task to link…"
            />
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">No linked tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {groups.map(([label, group]) => (
            <li key={label}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
              <ul className="space-y-1">
                {group.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700"
                  >
                    {link.task.status && (
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: link.task.status.color }} aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenLinkedTask(link.task.id)}
                      className="flex-1 truncate text-left text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-300"
                    >
                      {link.task.title}
                    </button>
                    {link.task.status && (
                      <span className="text-xs text-slate-400">{link.task.status.name}</span>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => deleteLink.mutate(link.id, {
                          onError: (err) => toast({ message: humanError(err), tone: 'error' }),
                        })}
                        aria-label="Remove link"
                        className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface CreatePayload { sourceTaskId: number; target_task_id: number; type: TaskLinkType }

/**
 * Translates a UI picker option to the canonical (source, target, type) tuple
 * that the API stores. Inverse pickers ("Blocked by", "Duplicated by") flip
 * which task is the source.
 */
function directionFromPickerKind(kind: PickerKind, selfId: number, otherId: number): CreatePayload {
  switch (kind) {
    case 'relates_to':    return { sourceTaskId: selfId,  target_task_id: otherId, type: 'relates_to' };
    case 'blocks':        return { sourceTaskId: selfId,  target_task_id: otherId, type: 'blocks' };
    case 'blocked_by':    return { sourceTaskId: otherId, target_task_id: selfId,  type: 'blocks' };
    case 'duplicates':    return { sourceTaskId: selfId,  target_task_id: otherId, type: 'duplicates' };
    case 'duplicated_by': return { sourceTaskId: otherId, target_task_id: selfId,  type: 'duplicates' };
  }
}

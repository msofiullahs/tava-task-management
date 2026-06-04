import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useCreateStatus, useDeleteStatus, useUpdateStatus } from '../api/statuses';
import { useMoveTask } from '../api/tasks';
import { useCurrentUser } from '../api/auth';
import { Avatar } from '../components/Avatar';
import { PriorityBadge } from '../components/PriorityPicker';
import { Button } from '../components/Button';
import { humanError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { format, parseISO } from 'date-fns';
import type { Status, Task } from '../types';

interface BoardViewProps {
  projectKey: string;
  statuses: Status[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  /** When provided, the per-column "+ Add task" button opens the parent's NewTaskModal. */
  onAddInStatus?: (statusId: number) => void;
}

/** Spec §8 — Kanban via @dnd-kit. Cards re-order/move statuses by drag; "Move to…" menu mirrors it. */
export function BoardView({ projectKey, statuses, tasks, onOpenTask, onAddInStatus }: BoardViewProps) {
  const { data: user } = useCurrentUser();
  const move = useMoveTask(projectKey);
  const createStatus = useCreateStatus(projectKey);
  const { toast } = useToast();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [newColumn, setNewColumn] = useState('');
  const canEdit = user && user.role !== 'guest';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = useMemo(() => {
    const byStatus = new Map<number, Task[]>();
    statuses.forEach((s) => byStatus.set(s.id, []));
    tasks.forEach((t) => {
      if (!byStatus.has(t.status_id)) byStatus.set(t.status_id, []);
      byStatus.get(t.status_id)!.push(t);
    });
    return statuses.map((s) => ({ status: s, items: byStatus.get(s.id) ?? [] }));
  }, [statuses, tasks]);

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => {
    setActiveTaskId(Number(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = Number(active.id);
    const overId = String(over.id);

    const fromStatusId = tasks.find((t) => t.id === activeId)?.status_id;
    if (!fromStatusId) return;

    // Dropping onto a column container — append to that column.
    if (overId.startsWith('column-')) {
      const toStatusId = Number(overId.replace('column-', ''));
      const colTasks = grouped.find((g) => g.status.id === toStatusId)?.items ?? [];
      const after = colTasks.filter((t) => t.id !== activeId).at(-1);
      move.mutate({ id: activeId, status_id: toStatusId, after_id: after?.id ?? null, before_id: null }, {
        onError: (err) => toast({ message: humanError(err), tone: 'error' }),
      });
      return;
    }

    // Dropping onto another card — insert before it.
    const overTaskId = Number(overId);
    const overTask = tasks.find((t) => t.id === overTaskId);
    if (!overTask) return;
    const toStatusId = overTask.status_id;
    const colTasks = grouped.find((g) => g.status.id === toStatusId)?.items ?? [];
    const withoutActive = colTasks.filter((t) => t.id !== activeId);
    const overIndex = withoutActive.findIndex((t) => t.id === overTaskId);
    const before = withoutActive[overIndex];
    const after = withoutActive[overIndex - 1];
    move.mutate({ id: activeId, status_id: toStatusId, before_id: before?.id ?? null, after_id: after?.id ?? null }, {
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  const onAddColumn = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !newColumn.trim()) return;
    createStatus.mutate({ name: newColumn.trim() }, {
      onSuccess: () => setNewColumn(''),
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  return (
    <div className="flex h-full overflow-x-auto p-4 lg:p-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex h-full items-start gap-3">
          {grouped.map(({ status, items }) => (
            <Column
              key={status.id}
              projectKey={projectKey}
              status={status}
              statuses={statuses}
              tasks={items}
              onOpenTask={onOpenTask}
              onAddTask={onAddInStatus}
            />
          ))}
          {canEdit && (
            <div className="w-72 shrink-0 rounded-lg border border-dashed border-slate-300 bg-white/50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
              <input
                value={newColumn}
                onChange={(e) => setNewColumn(e.target.value)}
                onKeyDown={onAddColumn}
                placeholder="+ Add status"
                className="w-full bg-transparent text-sm placeholder-slate-400 outline-none dark:text-slate-200"
              />
            </div>
          )}
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} statuses={statuses} onOpen={() => {}} dragging />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface ColumnProps {
  projectKey: string;
  status: Status;
  statuses: Status[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onAddTask?: (statusId: number) => void;
}

function Column({ projectKey, status, statuses, tasks, onOpenTask, onAddTask }: ColumnProps) {
  const { data: user } = useCurrentUser();
  const updateStatus = useUpdateStatus(projectKey);
  const deleteStatus = useDeleteStatus(projectKey);
  const { toast } = useToast();
  const canEdit = user && user.role !== 'guest';
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(status.name);

  const onDelete = () => {
    const others = statuses.filter((s) => s.id !== status.id);
    if (others.length === 0) {
      toast({ message: 'Add another status before deleting this one.', tone: 'error' });
      return;
    }
    if (tasks.length > 0) {
      const reassign = others[0];
      if (!confirm(`Delete "${status.name}"? Its ${tasks.length} task(s) will move to "${reassign.name}".`)) return;
      deleteStatus.mutate({ id: status.id, reassign_to: reassign.id });
    } else {
      if (!confirm(`Delete "${status.name}"?`)) return;
      deleteStatus.mutate({ id: status.id });
    }
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg bg-slate-100/60 dark:bg-slate-800/40">
      <header className="flex items-center gap-2 border-b border-slate-200/60 px-3 py-2 dark:border-slate-700/60">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: status.color }} aria-hidden />
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { setRenaming(false); if (name !== status.name) updateStatus.mutate({ id: status.id, name }); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setName(status.name); setRenaming(false); } }}
            className="flex-1 bg-transparent text-sm font-semibold outline-none"
          />
        ) : (
          <h3
            className={clsx('flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100', canEdit && 'cursor-text')}
            onDoubleClick={() => canEdit && setRenaming(true)}
            title={canEdit ? 'Double-click to rename' : undefined}
          >
            {status.name}
          </h3>
        )}
        <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700/80 dark:text-slate-300">
          {tasks.length}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${status.name}`}
            className="rounded p-1 text-slate-400 opacity-0 hover:bg-rose-100 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-900/30"
          >
            ×
          </button>
        )}
      </header>

      <div id={`column-${status.id}`} className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto px-2 py-2">
        <SortableContext id={`column-${status.id}`} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
              Drop a card here
            </div>
          )}
          {tasks.map((t) => (
            <SortableCard
              key={t.id}
              task={t}
              statuses={statuses}
              onOpen={() => onOpenTask(t)}
            />
          ))}
        </SortableContext>
      </div>

      {canEdit && onAddTask && (
        <div className="border-t border-slate-200/60 p-2 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onAddTask(status.id)}
            className={clsx(
              'flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium',
              'text-slate-500 transition hover:bg-white hover:text-indigo-600',
              'dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-indigo-300',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
            )}
          >
            <span aria-hidden className="text-base leading-none">+</span> Add a task
          </button>
        </div>
      )}
    </div>
  );
}

function SortableCard({ task, statuses, onOpen }: { task: Task; statuses: Status[]; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={clsx(isDragging && 'opacity-40')}>
      <TaskCard task={task} statuses={statuses} onOpen={onOpen} />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  statuses: Status[];
  onOpen: () => void;
  dragging?: boolean;
}

function TaskCard({ task, statuses, onOpen, dragging }: TaskCardProps) {
  const { data: user } = useCurrentUser();
  const move = useMoveTask(task.project_uuid);
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = user && user.role !== 'guest';

  return (
    <div
      className={clsx(
        'group relative cursor-pointer rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm transition',
        'dark:border-slate-700 dark:bg-slate-900',
        dragging ? 'rotate-1 shadow-lg' : 'hover:border-indigo-300 dark:hover:border-indigo-500',
      )}
      onClick={(e) => { if ((e.target as HTMLElement).closest('[data-no-open]')) return; onOpen(); }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex-1 font-medium text-slate-900 dark:text-slate-100">{task.title}</span>
        {canEdit && (
          <div className="relative" data-no-open>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              aria-label="Move to…"
              className="rounded p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-800"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-3 py-1.5 text-xs font-semibold uppercase text-slate-400 dark:border-slate-800">Move to…</div>
                {statuses.filter((s) => s.id !== task.status_id).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); move.mutate({ id: task.id, status_id: s.id, before_id: null, after_id: null }); }}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge value={task.priority} />
        {task.due_date && (
          <span className={clsx('text-xs', isOverdue(task.due_date) ? 'text-rose-600' : 'text-slate-500')}>
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
        <div className="ml-auto flex -space-x-1">
          {(task.assignees ?? []).slice(0, 3).map((a) => <Avatar key={a.id} name={a.name} src={a.avatar_url} size="xs" />)}
        </div>
      </div>
    </div>
  );
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return parseISO(date) < today;
}

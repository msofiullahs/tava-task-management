import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useDeleteProject, useProject } from '../api/projects';
import { useStatuses } from '../api/statuses';
import { useTasks } from '../api/tasks';
import { useCurrentUser } from '../api/auth';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { EmptyState } from '../components/EmptyState';
import { ListView } from '../views/ListView';
import { BoardView } from '../views/BoardView';
import { CalendarView } from '../views/CalendarView';
import type { Task } from '../types';
import { useToast } from '../lib/toast';
import { humanError } from '../lib/errors';

type ViewKey = 'list' | 'board' | 'calendar';

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'list', label: 'List' },
  { key: 'board', label: 'Board' },
  { key: 'calendar', label: 'Calendar' },
];

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: statuses = [] } = useStatuses(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(projectId);
  const deleteProject = useDeleteProject();
  const { toast } = useToast();

  const [view, setView] = useState<ViewKey>('list');
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!projectId) return null;
  if (projectLoading) return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  if (!project) return (
    <div className="p-8">
      <EmptyState title="Project not found" description="It may have been deleted." action={<Button onClick={() => navigate('/')}>Back to projects</Button>} />
    </div>
  );

  const fresh = openTask ? tasks.find((t) => t.id === openTask.id) ?? openTask : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{project.name}</h1>
            {project.description && (
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
            )}
          </div>
          {user?.role === 'admin' && (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>Delete project</Button>
          )}
        </div>
        <nav className="flex gap-1" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              onClick={() => setView(v.key)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                view === v.key
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tasksLoading ? (
          <div className="p-8 text-sm text-slate-500">Loading tasks…</div>
        ) : view === 'list' ? (
          <ListView projectId={projectId} statuses={statuses} tasks={tasks} onOpenTask={setOpenTask} />
        ) : view === 'board' ? (
          <BoardView projectId={projectId} statuses={statuses} tasks={tasks} onOpenTask={setOpenTask} />
        ) : (
          <CalendarView tasks={tasks} onOpenTask={setOpenTask} />
        )}
      </div>

      {fresh && <TaskDetailPanel task={fresh} statuses={statuses} onClose={() => setOpenTask(null)} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        description="The project, all its statuses, tasks, and comments will be removed. This can't be undone."
        confirmLabel="Delete project"
        destructive
        busy={deleteProject.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteProject.mutate(projectId, {
          onSuccess: () => { setConfirmDelete(false); navigate('/'); },
          onError: (err) => toast({ message: humanError(err), tone: 'error' }),
        })}
      />
    </div>
  );
}

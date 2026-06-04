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
import { NewTaskModal } from '../components/NewTaskModal';
import { ProjectMembersModal } from '../components/ProjectMembersModal';
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
  // URL is /projects/:projectKey — the param is the project's uuid (route-bound on the API too).
  const { projectKey } = useParams<{ projectKey: string }>();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: project, isLoading: projectLoading } = useProject(projectKey);
  const { data: statuses = [] } = useStatuses(projectKey);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(projectKey);
  const deleteProject = useDeleteProject();
  const { toast } = useToast();

  const [view, setView] = useState<ViewKey>('list');
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // newTaskSeed is the "open" signal — when set, the modal is open with these defaults.
  const [newTaskSeed, setNewTaskSeed] = useState<{ dueDate?: string | null; statusId?: number } | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const canCreateTask = !!user && user.role !== 'guest';

  if (!projectKey) return null;
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
            <h1 className="flex items-center gap-2 truncate text-xl font-semibold text-slate-900 dark:text-slate-100">
              <span className="truncate">{project.name}</span>
              {project.is_restricted && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  title={`Restricted to ${project.member_count} ${project.member_count === 1 ? 'person' : 'people'}`}
                >
                  <LockIcon /> Restricted
                </span>
              )}
            </h1>
            {project.description && (
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canCreateTask && (
              <Button onClick={() => setNewTaskSeed({})}>+ New task</Button>
            )}
            {user?.role === 'admin' && (
              <>
                <Button variant="secondary" onClick={() => setMembersOpen(true)}>Visibility</Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(true)}>Delete project</Button>
              </>
            )}
          </div>
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
          <ListView
            projectKey={projectKey}
            statuses={statuses}
            tasks={tasks}
            onOpenTask={setOpenTask}
            onAddInStatus={canCreateTask ? (statusId) => setNewTaskSeed({ statusId }) : undefined}
          />
        ) : view === 'board' ? (
          <BoardView
            projectKey={projectKey}
            statuses={statuses}
            tasks={tasks}
            onOpenTask={setOpenTask}
            onAddInStatus={canCreateTask ? (statusId) => setNewTaskSeed({ statusId }) : undefined}
          />
        ) : (
          <CalendarView
            tasks={tasks}
            onOpenTask={setOpenTask}
            onAddOnDate={canCreateTask ? (date) => setNewTaskSeed({ dueDate: date }) : undefined}
          />
        )}
      </div>

      {fresh && <TaskDetailPanel task={fresh} statuses={statuses} onClose={() => setOpenTask(null)} />}

      {newTaskSeed && (
        <NewTaskModal
          open
          onClose={() => setNewTaskSeed(null)}
          projectKey={projectKey}
          statuses={statuses}
          initialDueDate={newTaskSeed.dueDate ?? null}
          initialStatusId={newTaskSeed.statusId}
        />
      )}

      {user?.role === 'admin' && (
        <ProjectMembersModal
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          project={project}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        description="The project, all its statuses, tasks, and comments will be removed. This can't be undone."
        confirmLabel="Delete project"
        destructive
        busy={deleteProject.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteProject.mutate(projectKey, {
          onSuccess: () => { setConfirmDelete(false); navigate('/'); },
          onError: (err) => toast({ message: humanError(err), tone: 'error' }),
        })}
      />
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
      <path d="M4 7V5a4 4 0 0 1 8 0v2h.5a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 12.5 15h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4zm1.5 0h5V5a2.5 2.5 0 0 0-5 0v2z" />
    </svg>
  );
}

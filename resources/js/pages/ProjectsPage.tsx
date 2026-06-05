import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Lock, Plus } from 'lucide-react';
import { useCreateProject, useProjects } from '../api/projects';
import { useCurrentUser } from '../api/auth';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { TextArea, TextField } from '../components/TextField';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { humanError } from '../lib/errors';
import { useToast } from '../lib/toast';

export function ProjectsPage() {
  const { data: user } = useCurrentUser();
  const { data: projects = [], isLoading } = useProjects();
  const [creating, setCreating] = useState(false);
  const canCreate = user?.role === 'admin';

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pick a project to see its tasks.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        )}
      </div>

      {isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}><Skeleton className="h-24 w-full" /></li>
          ))}
        </ul>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={canCreate ? 'Create your first project to start tracking tasks.' : 'An admin needs to create a project before you can see one.'}
          action={canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Create your first project
            </Button>
          )}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.uuid}`}
                className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-500/10"
              >
                {/* Subtle indigo bar that lights up on hover — a small visual hook */}
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-indigo-500 to-violet-500 transition-transform duration-200 group-hover:scale-x-100" />
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-slate-900 dark:text-slate-100">
                    {p.is_restricted && (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Restricted" />
                    )}
                    <span className="truncate">{p.name}</span>
                  </h3>
                  {typeof p.task_count === 'number' && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {p.task_count} {p.task_count === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{p.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && <CreateProjectModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const create = useCreateProject();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate(
      { name, description: description || undefined },
      {
        onSuccess: () => { toast.toast({ message: 'Project created.', tone: 'success' }); onClose(); },
        onError: (err) => setError(humanError(err)),
      },
    );
  };

  return (
    <Modal open onClose={onClose} title="Create a project">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Project name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <TextArea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create project'}</Button>
        </div>
      </form>
    </Modal>
  );
}

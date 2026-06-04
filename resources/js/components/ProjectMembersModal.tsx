import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { TextField } from './TextField';
import { Avatar } from './Avatar';
import { useUsers } from '../api/users';
import { useUpdateProjectMembers } from '../api/projects';
import { useToast } from '../lib/toast';
import { humanError } from '../lib/errors';
import { ROLE_LABELS, type Project } from '../types';
import clsx from 'clsx';

interface ProjectMembersModalProps {
  open: boolean;
  onClose: () => void;
  project: Project;
}

/**
 * Admin-only visibility control. Empty selection = open to everyone (members +
 * viewers see it subject to existing rules). Non-empty = restricted: only the
 * listed people, plus all admins, can see this project.
 */
export function ProjectMembersModal({ open, onClose, project }: ProjectMembersModalProps) {
  const { data: users = [] } = useUsers();
  const update = useUpdateProjectMembers(project.uuid);
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');

  // Sync local state when the modal opens for a different project.
  useEffect(() => {
    setSelected(new Set(project.members?.map((m) => m.id) ?? []));
    setQuery('');
  }, [project.id, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;
  }, [users, query]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onSave = () => {
    update.mutate(Array.from(selected), {
      onSuccess: () => {
        toast({
          message: selected.size === 0
            ? 'Project is now visible to everyone.'
            : `Project visibility updated — ${selected.size} ${selected.size === 1 ? 'person' : 'people'} have access.`,
          tone: 'success',
        });
        onClose();
      },
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  const restricted = selected.size > 0;

  return (
    <Modal open={open} onClose={onClose} title="Project visibility" size="md">
      <div className="space-y-4">
        <div className={clsx(
          'rounded-md p-3 text-sm',
          restricted
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
        )}>
          {restricted ? (
            <>
              <strong>Restricted</strong> — only the selected people (plus all admins) can see this project.
            </>
          ) : (
            <>
              <strong>Open</strong> — every member and admin can see this project. Add people below to restrict it.
            </>
          )}
        </div>

        <TextField
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <ul className="max-h-72 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
          {filtered.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-slate-500">No people match.</li>
          )}
          {filtered.map((u) => {
            const checked = selected.has(u.id);
            return (
              <li key={u.id}>
                <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(u.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Avatar name={u.name} src={u.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{u.name}</div>
                    <div className="truncate text-xs text-slate-500">{u.email}</div>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {ROLE_LABELS[u.role]}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-slate-500 hover:text-rose-600 disabled:opacity-50"
            disabled={selected.size === 0 || update.isPending}
          >
            Clear all (make open)
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={update.isPending}>Cancel</Button>
            <Button onClick={onSave} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save visibility'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

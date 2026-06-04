import { useState, type FormEvent } from 'react';
import { useCreateUser, useDeleteUser, useResetUserPassword, useUpdateUser, useUsers } from '../api/users';
import { useDismissPasswordRequest, useFulfillPasswordRequest, usePasswordResetRequests } from '../api/password';
import { useCurrentUser } from '../api/auth';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TextField } from '../components/TextField';
import { Avatar } from '../components/Avatar';
import { humanError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { ROLE_LABELS, type Role, type User } from '../types';

/** Spec §5 + §9.10 — admin-only screen for adding/removing people, changing roles, resetting passwords. */
export function PeoplePage() {
  const { data: users = [] } = useUsers();
  const { data: me } = useCurrentUser();
  const [creating, setCreating] = useState(false);
  const [tempCredential, setTempCredential] = useState<{ user: User; password: string } | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);

  const create = useCreateUser();
  const update = useUpdateUser();
  const reset = useResetUserPassword();
  const remove = useDeleteUser();
  const { data: resetRequests = [] } = usePasswordResetRequests();
  const fulfill = useFulfillPasswordRequest();
  const dismiss = useDismissPasswordRequest();
  const { toast } = useToast();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">People</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Add teammates and manage roles.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Add person</Button>
      </div>

      {resetRequests.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">{resetRequests.length}</span>
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {resetRequests.length === 1 ? 'Password reset request' : 'Password reset requests'}
            </h2>
          </div>
          <ul className="divide-y divide-amber-200 dark:divide-amber-700/50">
            {resetRequests.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {r.user ? r.user.name : r.email}
                    {!r.user && <span className="ml-2 text-xs text-amber-700">(no matching account)</span>}
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    {r.email} · asked {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.user && (
                    <Button
                      size="sm"
                      onClick={() => fulfill.mutate(r.id, {
                        onSuccess: (data) => setTempCredential({ user: data.user, password: data.temp_password }),
                        onError: (err) => toast({ message: humanError(err), tone: 'error' }),
                      })}
                      disabled={fulfill.isPending}
                    >
                      Reset & copy password
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismiss.mutate(r.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.name} src={u.avatar_url} size="sm" />
                    <span className="text-slate-900 dark:text-slate-100">{u.name}</span>
                    {u.must_change_password && (
                      <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        Pending first sign-in
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={me?.id === u.id}
                    onChange={(e) => update.mutate(
                      { id: u.id, role: e.target.value as Role },
                      { onError: (err) => toast({ message: humanError(err), tone: 'error' }) },
                    )}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {(['admin', 'member', 'guest'] as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setResetting(u)}>Reset password</Button>
                  {me?.id !== u.id && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(u)}>Remove</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onCreated={(payload) => { setTempCredential(payload); setCreating(false); }}
        />
      )}

      {tempCredential && (
        <Modal open onClose={() => setTempCredential(null)} title="Share this temporary password" size="md">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Send {tempCredential.user.name} the temporary password below. They'll be asked to set their own on first sign-in.
          </p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-base dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {tempCredential.password}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(tempCredential.password); toast({ message: 'Copied.', tone: 'success' }); }}>Copy</Button>
            <Button onClick={() => setTempCredential(null)}>Done</Button>
          </div>
        </Modal>
      )}

      {resetting && (
        <ConfirmDialog
          open
          title={`Reset password for ${resetting.name}?`}
          description="A new temporary password will be generated for you to share with them."
          confirmLabel="Reset password"
          busy={reset.isPending}
          onCancel={() => setResetting(null)}
          onConfirm={() => reset.mutate(resetting.id, {
            onSuccess: (data) => { setResetting(null); setTempCredential({ user: data.user, password: data.temp_password }); },
            onError: (err) => toast({ message: humanError(err), tone: 'error' }),
          })}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open
          title={`Remove ${deleting.name}?`}
          description="They won't be able to sign in any more. Their tasks and comments stay."
          confirmLabel="Remove"
          destructive
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, {
            onSuccess: () => { setDeleting(null); toast({ message: 'Removed.', tone: 'success' }); },
            onError: (err) => toast({ message: humanError(err), tone: 'error' }),
          })}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (payload: { user: User; password: string }) => void }) {
  const create = useCreateUser();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate(
      { name, email, role },
      {
        onSuccess: (data) => onCreated({ user: data.user, password: data.temp_password }),
        onError: (err) => setError(humanError(err)),
      },
    );
  };

  return (
    <Modal open onClose={onClose} title="Add a person">
      <form onSubmit={onSubmit} className="space-y-3">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="admin">Admin — full access including managing people</option>
            <option value="member">Member — can create and edit tasks</option>
            <option value="guest">Viewer — can only see assigned tasks and comment</option>
          </select>
        </div>
        {error && <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create person'}</Button>
        </div>
      </form>
    </Modal>
  );
}

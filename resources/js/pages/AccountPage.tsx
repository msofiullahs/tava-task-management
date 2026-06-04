import { useState, type FormEvent } from 'react';
import { useChangePassword, useCurrentUser } from '../api/auth';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { humanError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { ROLE_LABELS } from '../types';

export function AccountPage() {
  const { data: user } = useCurrentUser();
  const change = useChangePassword();
  const { toast } = useToast();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    change.mutate(
      { current_password: current, password, password_confirmation: confirm },
      {
        onSuccess: () => {
          setCurrent(''); setPassword(''); setConfirm('');
          toast({ message: 'Password updated.', tone: 'success' });
        },
        onError: (err) => setError(humanError(err)),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Your account</h1>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Profile</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd className="text-slate-900 dark:text-slate-100">{user.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900 dark:text-slate-100">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="text-slate-900 dark:text-slate-100">{ROLE_LABELS[user.role]}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Change password</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <TextField label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          <TextField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required hint="At least 8 characters." autoComplete="new-password" />
          <TextField label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          {error && <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>}
          <Button type="submit" disabled={change.isPending}>{change.isPending ? 'Saving…' : 'Save'}</Button>
        </form>
      </section>
    </div>
  );
}

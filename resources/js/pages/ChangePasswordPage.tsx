import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChangePassword, useCurrentUser } from '../api/auth';
import { humanError } from '../lib/errors';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { Logo } from '../components/Logo';

/** Spec §5 — forced-change screen after admin temp-password login. Also reachable from the user menu. */
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const forced = !!user?.must_change_password;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    changePassword.mutate(
      { current_password: forced ? undefined : current, password, password_confirmation: confirm },
      {
        onSuccess: () => navigate('/'),
        onError: (err) => setError(humanError(err)),
      },
    );
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 h-12 w-12" />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {forced ? 'Set your password' : 'Change password'}
          </h1>
          {forced && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              You're using a temporary password. Pick a new one to continue.
            </p>
          )}
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {!forced && (
            <TextField label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          )}
          <TextField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required hint="At least 8 characters." autoComplete="new-password" />
          <TextField label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          {error && <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>}
          <Button type="submit" disabled={changePassword.isPending} className="w-full">
            {changePassword.isPending ? 'Saving…' : 'Save password'}
          </Button>
        </form>
      </div>
    </div>
  );
}

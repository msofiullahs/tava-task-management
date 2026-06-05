import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetup } from '../api/auth';
import { humanError } from '../lib/errors';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { PasswordField } from '../components/PasswordField';
import { Logo } from '../components/Logo';

/** Spec §5 — first-run wizard. Replaces the login form when zero users exist. */
export function SetupPage() {
  const navigate = useNavigate();
  const setup = useSetup();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [seed, setSeed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setup.mutate(
      { name, email, password, password_confirmation: confirm, seed_sample: seed },
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Welcome to Tava</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Let's create your admin account. You can add teammates from inside the app.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus autoComplete="name" />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required hint="At least 8 characters." autoComplete="new-password" />
          <PasswordField label="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={seed} onChange={(e) => setSeed(e.target.checked)} className="mt-0.5" />
            <span>Add a sample project so I can explore.</span>
          </label>
          {error && <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>}
          <Button type="submit" disabled={setup.isPending} className="w-full">
            {setup.isPending ? 'Creating…' : 'Create my account'}
          </Button>
        </form>
      </div>
    </div>
  );
}

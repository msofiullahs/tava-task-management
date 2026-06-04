import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../api/password';
import { humanError } from '../lib/errors';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { Logo } from '../components/Logo';

/**
 * No-SMTP forgot-password flow. We don't email a reset link — we record the
 * request and surface it to admins on the People page. They reset + share the
 * temp password manually (same pattern as user invites, spec §5).
 */
export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    forgot.mutate(email, {
      onSuccess: () => setSent(true),
      onError: (err) => setError(humanError(err)),
    });
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 h-12 w-12" />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {sent ? 'Request sent' : 'Reset your password'}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {sent
              ? 'An admin will reset your password and share the new one with you.'
              : 'Enter your email and we\'ll let your admins know. They\'ll send you a new password.'}
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You'll receive your new temporary password from an admin (Slack, in person, however you usually talk).
              Once you sign in with it, you'll be asked to pick your own password.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                to="/login"
                className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
            {error && (
              <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                {error}
              </div>
            )}
            <Button type="submit" disabled={forgot.isPending} className="w-full">
              {forgot.isPending ? 'Sending…' : 'Request a reset'}
            </Button>
            <div className="text-center text-sm">
              <Link to="/login" className="text-slate-500 hover:underline dark:text-slate-400">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

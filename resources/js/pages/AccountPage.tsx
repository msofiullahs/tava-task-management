import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useChangePassword, useCurrentUser, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from '../api/auth';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { humanError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { ROLE_LABELS } from '../types';

export function AccountPage() {
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const change = useChangePassword();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  // Sync local state when the loaded user changes (first render, after save).
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user?.id, user?.name, user?.email]);

  if (!user) return null;

  const onSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    const patch: { name?: string; email?: string } = {};
    if (name !== user.name) patch.name = name;
    if (email !== user.email) patch.email = email;
    if (Object.keys(patch).length === 0) {
      toast({ message: 'Nothing to save.', tone: 'info' });
      return;
    }
    updateProfile.mutate(patch, {
      onSuccess: () => toast({ message: 'Profile updated.', tone: 'success' }),
      onError: (err) => setProfileError(humanError(err)),
    });
  };

  const onPickAvatar = (file: File | undefined) => {
    if (!file) return;
    uploadAvatar.mutate(file, {
      onSuccess: () => toast({ message: 'Avatar updated.', tone: 'success' }),
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  const onPassword = (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    change.mutate(
      { current_password: current, password, password_confirmation: confirm },
      {
        onSuccess: () => {
          setCurrent(''); setPassword(''); setConfirm('');
          toast({ message: 'Password updated.', tone: 'success' });
        },
        onError: (err) => setPasswordError(humanError(err)),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Your account</h1>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Profile picture</h2>
        <div className="flex items-center gap-4">
          <Avatar name={user.name} src={user.avatar_url} size="lg" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? 'Uploading…' : user.avatar_url ? 'Change' : 'Upload picture'}
              </Button>
              {user.avatar_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAvatar.mutate(undefined, {
                    onSuccess: () => toast({ message: 'Picture removed.', tone: 'success' }),
                    onError: (err) => toast({ message: humanError(err), tone: 'error' }),
                  })}
                  disabled={removeAvatar.isPending}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500">JPG, PNG, GIF, or WebP. Up to 2 MB.</p>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => { onPickAvatar(e.target.files?.[0]); e.target.value = ''; }}
            />
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Profile</h2>
        <form onSubmit={onSaveProfile} className="space-y-3">
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Role</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {ROLE_LABELS[user.role]} <span className="text-slate-400">— ask an admin to change this.</span>
            </p>
          </div>
          {profileError && <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{profileError}</div>}
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Change password</h2>
        <form onSubmit={onPassword} className="space-y-3">
          <TextField label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          <TextField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required hint="At least 8 characters." autoComplete="new-password" />
          <TextField label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          {passwordError && <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{passwordError}</div>}
          <Button type="submit" disabled={change.isPending}>{change.isPending ? 'Saving…' : 'Save password'}</Button>
        </form>
      </section>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { useAllAttachments, useDeleteAttachment } from '../api/attachments';
import { useCurrentUser } from '../api/auth';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { TextField } from '../components/TextField';
import { useToast } from '../lib/toast';
import { humanError } from '../lib/errors';

/** Global media browser. Lists every upload across tasks + comments with copy-link affordance. */
export function FilesPage() {
  const { data: me } = useCurrentUser();
  const { data: files = [], isLoading } = useAllAttachments();
  const remove = useDeleteAttachment();
  const { toast } = useToast();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) =>
      f.original_name.toLowerCase().includes(q)
      || f.source?.label?.toLowerCase().includes(q)
      || f.uploader?.name?.toLowerCase().includes(q),
    );
  }, [files, query]);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: 'Link copied.', tone: 'success' });
    } catch {
      toast({ message: 'Couldn\'t copy automatically. Right-click the file link to copy its address.', tone: 'error' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Files</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Everything uploaded across tasks and comments. Copy a link to share it.
          </p>
        </div>
        <TextField
          className="sm:w-72"
          placeholder="Search by name, task, or person…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={files.length === 0 ? 'No files yet' : 'No files match that search'}
          description={files.length === 0
            ? 'Drop a file into any task description or comment and it\'ll show up here.'
            : 'Try a different keyword.'}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-2 font-medium">File</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Source</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Uploaded by</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">When</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Thumb src={f.is_image ? f.url : null} mime={f.mime_type} />
                      <div className="min-w-0">
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-slate-900 hover:text-indigo-600 dark:text-slate-100"
                          title={f.original_name}
                        >
                          {f.original_name}
                        </a>
                        <div className="text-xs text-slate-400">{formatBytes(f.size_bytes)} · {f.mime_type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {f.source?.project_uuid && f.source?.task_id ? (
                      <Link
                        to={`/projects/${f.source.project_uuid}`}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                        title="Open the project"
                      >
                        {f.source.label}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {f.uploader ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                        <Avatar name={f.uploader.name} src={f.uploader.avatar_url} size="xs" />
                        {f.uploader.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-slate-500 lg:table-cell" title={format(parseISO(f.created_at), 'PPpp')}>
                    {format(parseISO(f.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => copy(f.url)}>Copy link</Button>
                    {(me?.role === 'admin' || me?.id === f.uploader?.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove.mutate(f.id, {
                          onError: (err) => toast({ message: humanError(err), tone: 'error' }),
                        })}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Thumb({ src, mime }: { src: string | null; mime: string }) {
  if (src) {
    return <img src={src} alt="" className="h-10 w-10 rounded object-cover" />;
  }
  return (
    <div
      className={clsx(
        'flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-[10px] font-medium uppercase text-slate-400',
        'dark:bg-slate-800',
      )}
      title={mime}
    >
      {extLabel(mime)}
    </div>
  );
}

function extLabel(mime: string): string {
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('zip') || mime.includes('compressed')) return 'ZIP';
  if (mime.includes('word') || mime.includes('document')) return 'DOC';
  if (mime.includes('sheet') || mime.includes('excel')) return 'XLS';
  if (mime.includes('text/')) return 'TXT';
  if (mime.startsWith('video/')) return 'VID';
  if (mime.startsWith('audio/')) return 'AUD';
  return 'FILE';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

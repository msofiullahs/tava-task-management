import { useRef, useState, type DragEvent } from 'react';
import clsx from 'clsx';
import { Download, Eye, File, Link2, Paperclip, Trash2 } from 'lucide-react';
import { useDeleteAttachment, useUploadAttachment } from '../api/attachments';
import { useCurrentUser } from '../api/auth';
import { useToast } from '../lib/toast';
import { humanError } from '../lib/errors';
import { ImagePreviewModal } from './ImagePreviewModal';
import type { Attachment } from '../types';

interface AttachmentListProps {
  attachments: Attachment[];
  /** Where new uploads attach to. */
  parentType: 'task' | 'comment';
  parentId: number;
  /** Project uuid — used purely for cache invalidation after upload/delete. */
  projectKey?: string;
  /** Hide the uploader (e.g. for read-only Viewers). */
  readOnly?: boolean;
  /** Compact = comment-thread variant (smaller, fewer affordances). */
  compact?: boolean;
}

export function AttachmentList({
  attachments, parentType, parentId, projectKey, readOnly, compact,
}: AttachmentListProps) {
  const { data: me } = useCurrentUser();
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewing, setPreviewing] = useState<Attachment | null>(null);

  const allowUpload = !readOnly;

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      upload.mutate(
        { file, attachable_type: parentType, attachable_id: parentId, projectKey },
        { onError: (err) => toast({ message: humanError(err), tone: 'error' }) },
      );
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!allowUpload) return;
    onFiles(e.dataTransfer.files);
  };

  const onCopyLink = async (att: Attachment) => {
    try {
      // Build absolute URL so the copied string is shareable as-is, not relative to the current page.
      const absolute = att.url.startsWith('http') ? att.url : new URL(att.url, window.location.origin).toString();
      await navigator.clipboard.writeText(absolute);
      toast({ message: 'Link copied.', tone: 'success' });
    } catch {
      toast({ message: 'Couldn\'t copy automatically. Right-click the file to copy its address.', tone: 'error' });
    }
  };

  /** Forces a download via a temporary anchor with the `download` attribute set. */
  const onDownload = (att: Attachment) => {
    const a = document.createElement('a');
    a.href = att.url;
    a.download = att.original_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      onDragOver={(e) => { if (allowUpload) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={clsx('rounded-lg', dragOver && 'ring-2 ring-indigo-400')}
    >
      {attachments.length > 0 && (
        <ul className={clsx('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3')}>
          {attachments.map((att) => (
            <li key={att.id}>
              <AttachmentTile
                att={att}
                compact={!!compact}
                canDelete={!!me && (me.role === 'admin' || att.uploader?.id === me.id)}
                onPreview={() => setPreviewing(att)}
                onDownload={() => onDownload(att)}
                onCopy={() => onCopyLink(att)}
                onDelete={() => remove.mutate(att.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {allowUpload && (
        <div className={clsx('mt-2 flex items-center gap-2', attachments.length === 0 && 'mt-0')}>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600',
              'hover:border-indigo-400 hover:text-indigo-600',
              'dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300',
            )}
          >
            <Paperclip className="h-3.5 w-3.5" /> {upload.isPending ? 'Uploading…' : compact ? 'Attach file' : 'Attach files'}
          </button>
          {!compact && <span className="text-xs text-slate-400">…or drop them here</span>}
        </div>
      )}

      {previewing && previewing.is_image && (
        <ImagePreviewModal
          open
          src={previewing.url}
          alt={previewing.original_name}
          caption={previewing.original_name}
          onClose={() => setPreviewing(null)}
          onDownload={() => onDownload(previewing)}
        />
      )}
    </div>
  );
}

interface TileProps {
  att: Attachment;
  compact: boolean;
  canDelete: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

function AttachmentTile({ att, compact, canDelete, onPreview, onDownload, onCopy, onDelete }: TileProps) {
  const sizeLabel = formatBytes(att.size_bytes);

  return (
    <div className={clsx(
      'group relative flex overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
      compact ? 'p-2' : 'flex-col',
    )}>
      {att.is_image ? (
        // Click the thumbnail to open the lightbox (faster than going via the menu).
        <button
          type="button"
          onClick={onPreview}
          aria-label={`Preview ${att.original_name}`}
          className={clsx(
            'group/img relative block bg-slate-50 dark:bg-slate-800',
            compact ? 'h-12 w-12 shrink-0' : 'aspect-video w-full',
          )}
        >
          <img src={att.url} alt={att.original_name} className="h-full w-full object-cover" />
          {!compact && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition group-hover/img:bg-slate-900/40 group-hover/img:opacity-100">
              <Eye className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onDownload}
          aria-label={`Download ${att.original_name}`}
          className={clsx(
            'flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/80',
            compact ? 'h-12 w-12 shrink-0' : 'aspect-video w-full',
          )}
        >
          <File className="h-8 w-8" />
        </button>
      )}

      <div className={clsx('flex min-w-0 flex-1 flex-col justify-between gap-1 p-2', compact && 'pl-3')}>
        <button
          type="button"
          onClick={att.is_image ? onPreview : onDownload}
          className="truncate text-left text-xs font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-300"
          title={att.original_name}
        >
          {att.original_name}
        </button>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{sizeLabel}</span>
          <div className="flex gap-0.5">
            {att.is_image && (
              <IconButton onClick={onPreview} title="Preview"><Eye className="h-3.5 w-3.5" /></IconButton>
            )}
            <IconButton onClick={onDownload} title="Download"><Download className="h-3.5 w-3.5" /></IconButton>
            <IconButton onClick={onCopy} title="Copy link"><Link2 className="h-3.5 w-3.5" /></IconButton>
            {canDelete && (
              <IconButton onClick={onDelete} title="Remove" tone="danger"><Trash2 className="h-3.5 w-3.5" /></IconButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children, onClick, title, tone,
}: { children: React.ReactNode; onClick: () => void; title: string; tone?: 'danger' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={clsx(
        'rounded p-1 transition',
        tone === 'danger'
          ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30'
          : 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
      )}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

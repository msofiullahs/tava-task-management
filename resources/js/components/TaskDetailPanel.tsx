import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDeleteComment, useComments, useCreateComment } from '../api/comments';
import { useUploadAttachment } from '../api/attachments';
import { useDeleteTask, useRestoreTask, useUpdateTask } from '../api/tasks';
import { useCurrentUser } from '../api/auth';
import { Modal } from './Modal';
import { TextField, TextArea } from './TextField';
import { Button } from './Button';
import { DatePicker } from './DatePicker';
import { AssigneePicker } from './AssigneePicker';
import { PriorityPicker } from './PriorityPicker';
import { StatusSelect } from './StatusSelect';
import { Avatar } from './Avatar';
import { AttachmentList } from './AttachmentList';
import { humanError } from '../lib/errors';
import { useToast } from '../lib/toast';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { Priority, Status, Task } from '../types';

interface TaskDetailPanelProps {
  task: Task;
  statuses: Status[];
  onClose: () => void;
}

export function TaskDetailPanel({ task, statuses, onClose }: TaskDetailPanelProps) {
  const { data: user } = useCurrentUser();
  const update = useUpdateTask(task.project_id);
  const remove = useDeleteTask(task.project_id);
  const restore = useRestoreTask(task.project_id);
  const { undoToast, toast } = useToast();
  const canEdit = user && user.role !== 'guest';

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [statusId, setStatusId] = useState(task.status_id);
  const [priority, setPriority] = useState<Priority | null>(task.priority);
  const [dueDate, setDueDate] = useState<string | null>(task.due_date);
  const [assigneeIds, setAssigneeIds] = useState<number[]>(task.assignees?.map((a) => a.id) ?? []);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatusId(task.status_id);
    setPriority(task.priority);
    setDueDate(task.due_date);
    setAssigneeIds(task.assignees?.map((a) => a.id) ?? []);
  }, [task.id]);

  const save = (patch: Partial<{ title: string; description: string | null; status_id: number; priority: Priority | null; due_date: string | null; assignee_ids: number[] }>) => {
    if (!canEdit) return;
    update.mutate({ id: task.id, ...patch }, {
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  const onDelete = () => {
    remove.mutate(task.id, {
      onSuccess: () => {
        // Spec §9.4 — soft delete + 7s "Undo" toast that hits /restore.
        undoToast('Task deleted', () => restore.mutate(task.id));
        onClose();
      },
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  return (
    <Modal open onClose={onClose} size="lg" title="">
      <div className="space-y-5">
        <input
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { if (title !== task.title) save({ title }); }}
          className="w-full bg-transparent text-xl font-semibold text-slate-900 outline-none focus:ring-0 dark:text-slate-100"
        />

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Status</label>
            <StatusSelect
              value={statusId}
              statuses={statuses}
              disabled={!canEdit}
              onChange={(v) => { setStatusId(v); save({ status_id: v }); }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Due date</label>
            <DatePicker value={dueDate} onChange={(v) => { setDueDate(v); save({ due_date: v }); }} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Priority</label>
            <PriorityPicker value={priority} onChange={(v) => { setPriority(v); save({ priority: v }); }} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Assignees</label>
            <AssigneePicker selected={assigneeIds} onChange={(ids) => { setAssigneeIds(ids); save({ assignee_ids: ids }); }} />
          </div>
        </div>

        <TextArea
          label="Description"
          rows={5}
          disabled={!canEdit}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => { if (description !== (task.description ?? '')) save({ description: description || null }); }}
        />

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Attachments</h3>
          <AttachmentList
            attachments={task.attachments ?? []}
            parentType="task"
            parentId={task.id}
            projectId={task.project_id}
            readOnly={!canEdit}
          />
        </section>

        <CommentThread taskId={task.id} />

        {canEdit && (
          <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="danger" onClick={onDelete} disabled={remove.isPending}>
              Delete task
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CommentThread({ taskId }: { taskId: number }) {
  const { data: user } = useCurrentUser();
  const { data: comments = [] } = useComments(taskId);
  const create = useCreateComment(taskId);
  const remove = useDeleteComment(taskId);
  const [body, setBody] = useState('');
  const { toast } = useToast();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    create.mutate(body, {
      onSuccess: () => setBody(''),
      onError: (err) => toast({ message: humanError(err), tone: 'error' }),
    });
  };

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Comments</h3>
      <ul className="space-y-3">
        {comments.length === 0 && <li className="text-sm text-slate-500">No comments yet.</li>}
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.user.name} size="sm" />
            <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-200">{c.user.name}</span>
                <span className="text-slate-400" title={format(parseISO(c.created_at), 'PPpp')}>
                  {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{c.body}</p>
              {(c.attachments?.length ?? 0) > 0 && (
                <div className="mt-2">
                  <AttachmentList
                    attachments={c.attachments ?? []}
                    parentType="comment"
                    parentId={c.id}
                    readOnly
                    compact
                  />
                </div>
              )}
              <div className="mt-1 flex items-center gap-3 text-xs">
                <AttachToComment commentId={c.id} />
                {(user?.role === 'admin' || user?.id === c.user.id) && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(c.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <TextField className="flex-1" placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button type="submit" disabled={create.isPending || !body.trim()}>Post</Button>
      </form>
    </section>
  );
}

/**
 * Inline "Attach file" link beneath each posted comment. We don't add files to
 * a draft comment because the backend needs the comment row to exist first;
 * posting a quick comment then attaching is a small, friction-light flow.
 */
function AttachToComment({ commentId }: { commentId: number }) {
  const upload = useUploadAttachment();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      upload.mutate(
        { file, attachable_type: 'comment', attachable_id: commentId },
        { onError: (err) => toast({ message: humanError(err), tone: 'error' }) },
      );
    }
  };

  return (
    <>
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
        className="text-slate-400 hover:text-indigo-600"
      >
        {upload.isPending ? 'Uploading…' : 'Attach file'}
      </button>
    </>
  );
}

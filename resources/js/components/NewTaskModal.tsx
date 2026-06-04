import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { TextField } from './TextField';
import { DatePicker } from './DatePicker';
import { AssigneePicker } from './AssigneePicker';
import { PriorityPicker } from './PriorityPicker';
import { StatusSelect } from './StatusSelect';
import { RichTextEditor, rewriteInlineImagesForTask } from './RichTextEditor';
import { useCreateTask, useUpdateTask } from '../api/tasks';
import { useToast } from '../lib/toast';
import { humanError } from '../lib/errors';
import type { Priority, Status } from '../types';

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  projectKey: string;
  statuses: Status[];
  /** Optional defaults — used by Calendar's date-cell click and per-column "+" buttons. */
  initialStatusId?: number;
  initialDueDate?: string | null;
}

/**
 * Spec §9 keeps the inline quick-add for speed, but the user asked for a real modal
 * with every field surfaced — useful for the calendar (where you don't have a column
 * to type into) and for tasks that need detail at creation time.
 *
 * Description uses the RichTextEditor in "deferred" mode — pasted/dropped images
 * become data: URLs until we have a task id to attach them to. After creating the
 * task we upload each inline image and PATCH the description with the rewritten HTML.
 */
export function NewTaskModal({
  open, onClose, projectKey, statuses, initialStatusId, initialDueDate = null,
}: NewTaskModalProps) {
  const create = useCreateTask(projectKey);
  const update = useUpdateTask(projectKey);
  const { toast } = useToast();

  const defaultStatusId = initialStatusId
    ?? statuses.find((s) => s.is_default)?.id
    ?? statuses[0]?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState<number | undefined>(defaultStatusId);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(initialDueDate);
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Two-phase progress: "Creating…" while the task POST is in flight,
  // "Uploading images…" while we walk the description for data: URLs.
  const [phase, setPhase] = useState<'idle' | 'creating' | 'uploading'>('idle');

  const reset = () => {
    setTitle(''); setDescription('');
    setStatusId(defaultStatusId);
    setPriority(null);
    setDueDate(initialDueDate);
    setAssigneeIds([]);
    setError(null);
    setPhase('idle');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task name.');
      return;
    }
    setError(null);

    try {
      setPhase('creating');
      const task = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        status_id: statusId,
        priority,
        due_date: dueDate,
        assignee_ids: assigneeIds,
      });

      // If the description had inline data: images, upload them now that the task
      // exists and update the description with the rewritten HTML.
      if (description && /data:image\//.test(description)) {
        setPhase('uploading');
        const rewritten = await rewriteInlineImagesForTask(description, task.id);
        if (rewritten !== description) {
          await update.mutateAsync({ id: task.id, description: rewritten });
        }
      }

      toast({ message: 'Task created.', tone: 'success' });
      reset();
      onClose();
    } catch (err) {
      setError(humanError(err));
      setPhase('idle');
    }
  };

  const busy = phase !== 'idle';
  const submitLabel = phase === 'creating' ? 'Creating…' : phase === 'uploading' ? 'Uploading images…' : 'Create task';

  return (
    <Modal open={open} onClose={() => { if (!busy) { reset(); onClose(); } }} title="New task" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Task name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          placeholder="What needs to happen?"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Add details, paste screenshots, drop images…"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
            <StatusSelect
              value={statusId}
              statuses={statuses}
              onChange={setStatusId}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Due date</label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Priority</label>
            <PriorityPicker value={priority} onChange={setPriority} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Assignees</label>
            <AssigneePicker selected={assigneeIds} onChange={setAssigneeIds} />
          </div>
        </div>

        {error && (
          <div className="rounded bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={() => { reset(); onClose(); }} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

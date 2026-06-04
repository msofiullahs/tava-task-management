import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { TextField, TextArea } from './TextField';
import { DatePicker } from './DatePicker';
import { AssigneePicker } from './AssigneePicker';
import { PriorityPicker } from './PriorityPicker';
import { StatusSelect } from './StatusSelect';
import { useCreateTask } from '../api/tasks';
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
 */
export function NewTaskModal({
  open, onClose, projectKey, statuses, initialStatusId, initialDueDate = null,
}: NewTaskModalProps) {
  const create = useCreateTask(projectKey);
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

  const reset = () => {
    setTitle(''); setDescription('');
    setStatusId(defaultStatusId);
    setPriority(null);
    setDueDate(initialDueDate);
    setAssigneeIds([]);
    setError(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task name.');
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        status_id: statusId,
        priority,
        due_date: dueDate,
        assignee_ids: assigneeIds,
      },
      {
        onSuccess: () => { reset(); onClose(); toast({ message: 'Task created.', tone: 'success' }); },
        onError: (err) => setError(humanError(err)),
      },
    );
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="New task" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Task name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          placeholder="What needs to happen?"
        />

        <TextArea
          label="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any details, links, or acceptance criteria."
          hint="You can attach files after creating the task."
        />

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
          <Button variant="secondary" onClick={() => { reset(); onClose(); }} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

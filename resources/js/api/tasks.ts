import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { Priority, Task } from '../types';

interface StoreTaskPayload {
  title: string;
  description?: string | null;
  status_id?: number;
  priority?: Priority | null;
  due_date?: string | null;
  assignee_ids?: number[];
}

interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status_id?: number;
  priority?: Priority | null;
  due_date?: string | null;
  assignee_ids?: number[] | null;
}

interface MoveTaskPayload {
  status_id: number;
  before_id?: number | null;
  after_id?: number | null;
}

export function useTasks(projectId: number | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'tasks'],
    queryFn: async () =>
      (await http.get<{ data: Task[] }>(`/projects/${projectId}/tasks`)).data.data,
    enabled: projectId !== undefined,
  });
}

export function useCreateTask(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StoreTaskPayload) =>
      (await http.post<{ task: Task }>(`/projects/${projectId}/tasks`, payload)).data.task,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] }),
  });
}

export function useUpdateTask(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & UpdateTaskPayload) =>
      (await http.patch<{ task: Task }>(`/tasks/${id}`, payload)).data.task,
    onSuccess: (task) => {
      qc.setQueryData<Task[] | undefined>(['projects', projectId, 'tasks'], (prev) =>
        prev ? prev.map((t) => (t.id === task.id ? task : t)) : prev,
      );
    },
  });
}

/** Optimistic move (spec §8: card moves instantly; roll back on error). */
export function useMoveTask(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & MoveTaskPayload) =>
      (await http.patch<{ task: Task }>(`/tasks/${id}/move`, payload)).data.task,
    onMutate: async ({ id, status_id }) => {
      await qc.cancelQueries({ queryKey: ['projects', projectId, 'tasks'] });
      const prev = qc.getQueryData<Task[]>(['projects', projectId, 'tasks']);
      if (prev) {
        qc.setQueryData<Task[]>(['projects', projectId, 'tasks'],
          prev.map((t) => (t.id === id ? { ...t, status_id } : t)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['projects', projectId, 'tasks'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] }),
  });
}

export function useDeleteTask(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/tasks/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] }),
  });
}

export function useRestoreTask(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await http.post<{ task: Task }>(`/tasks/${id}/restore`)).data.task,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] }),
  });
}

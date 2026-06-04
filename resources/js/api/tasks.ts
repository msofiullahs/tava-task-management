import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { ProjectKey } from './projects';
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

export function useTasks(projectKey: ProjectKey | undefined) {
  return useQuery({
    queryKey: ['projects', projectKey, 'tasks'],
    queryFn: async () =>
      (await http.get<{ data: Task[] }>(`/projects/${projectKey}/tasks`)).data.data,
    enabled: projectKey !== undefined,
  });
}

export function useCreateTask(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StoreTaskPayload) =>
      (await http.post<{ task: Task }>(`/projects/${projectKey}/tasks`, payload)).data.task,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectKey, 'tasks'] }),
  });
}

export function useUpdateTask(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & UpdateTaskPayload) =>
      (await http.patch<{ task: Task }>(`/tasks/${id}`, payload)).data.task,
    onSuccess: (task) => {
      qc.setQueryData<Task[] | undefined>(['projects', projectKey, 'tasks'], (prev) =>
        prev ? prev.map((t) => (t.id === task.id ? task : t)) : prev,
      );
    },
  });
}

/** Optimistic move (spec §8: card moves instantly; roll back on error). */
export function useMoveTask(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & MoveTaskPayload) =>
      (await http.patch<{ task: Task }>(`/tasks/${id}/move`, payload)).data.task,
    onMutate: async ({ id, status_id }) => {
      await qc.cancelQueries({ queryKey: ['projects', projectKey, 'tasks'] });
      const prev = qc.getQueryData<Task[]>(['projects', projectKey, 'tasks']);
      if (prev) {
        qc.setQueryData<Task[]>(['projects', projectKey, 'tasks'],
          prev.map((t) => (t.id === id ? { ...t, status_id } : t)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['projects', projectKey, 'tasks'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['projects', projectKey, 'tasks'] }),
  });
}

export function useDeleteTask(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/tasks/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectKey, 'tasks'] }),
  });
}

export function useRestoreTask(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await http.post<{ task: Task }>(`/tasks/${id}/restore`)).data.task,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectKey, 'tasks'] }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { ProjectKey } from './projects';
import type { Status } from '../types';

export function useStatuses(projectKey: ProjectKey | undefined) {
  return useQuery({
    queryKey: ['projects', projectKey, 'statuses'],
    queryFn: async () =>
      (await http.get<{ data: Status[] }>(`/projects/${projectKey}/statuses`)).data.data,
    enabled: projectKey !== undefined,
  });
}

export function useCreateStatus(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string; before_id?: number; after_id?: number }) =>
      (await http.post<{ status: Status }>(`/projects/${projectKey}/statuses`, payload)).data.status,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectKey, 'statuses'] });
      qc.invalidateQueries({ queryKey: ['projects', projectKey] });
    },
  });
}

export function useUpdateStatus(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string; color?: string; is_default?: boolean; before_id?: number; after_id?: number }) =>
      (await http.patch<{ status: Status }>(`/statuses/${id}`, payload)).data.status,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectKey, 'statuses'] });
    },
  });
}

export function useDeleteStatus(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reassign_to }: { id: number; reassign_to?: number }) => {
      await http.delete(`/statuses/${id}`, { params: reassign_to ? { reassign_to } : {} });
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectKey, 'statuses'] });
      qc.invalidateQueries({ queryKey: ['projects', projectKey, 'tasks'] });
    },
  });
}

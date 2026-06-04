import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { Status } from '../types';

export function useStatuses(projectId: number | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'statuses'],
    queryFn: async () =>
      (await http.get<{ data: Status[] }>(`/projects/${projectId}/statuses`)).data.data,
    enabled: projectId !== undefined,
  });
}

export function useCreateStatus(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string; before_id?: number; after_id?: number }) =>
      (await http.post<{ status: Status }>(`/projects/${projectId}/statuses`, payload)).data.status,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'statuses'] });
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}

export function useUpdateStatus(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string; color?: string; is_default?: boolean; before_id?: number; after_id?: number }) =>
      (await http.patch<{ status: Status }>(`/statuses/${id}`, payload)).data.status,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'statuses'] });
    },
  });
}

export function useDeleteStatus(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reassign_to }: { id: number; reassign_to?: number }) => {
      await http.delete(`/statuses/${id}`, { params: reassign_to ? { reassign_to } : {} });
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'statuses'] });
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] });
    },
  });
}

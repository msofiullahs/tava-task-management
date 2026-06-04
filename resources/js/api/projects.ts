import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { Project } from '../types';

/**
 * The project "key" used in URLs and React Query keys is the project's uuid
 * (string), not its numeric primary key. Route-model binding on the API
 * resolves the uuid back to a Project, so the same string flows through
 * both layers.
 */
export type ProjectKey = string;

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await http.get<{ data: Project[] }>('/projects')).data.data,
  });
}

export function useProject(projectKey: ProjectKey | undefined) {
  return useQuery({
    queryKey: ['projects', projectKey],
    queryFn: async () => (await http.get<{ project: Project }>(`/projects/${projectKey}`)).data.project,
    enabled: projectKey !== undefined,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) =>
      (await http.post<{ project: Project }>('/projects', payload)).data.project,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string; description?: string | null }) =>
      (await http.patch<{ project: Project }>(`/projects/${projectKey}`, payload)).data.project,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects', projectKey] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectKey: ProjectKey) => {
      await http.delete(`/projects/${projectKey}`);
      return projectKey;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProjectMembers(projectKey: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_ids: number[]) =>
      (await http.patch<{ project: Project }>(`/projects/${projectKey}/members`, { user_ids })).data.project,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projects', projectKey] });
    },
  });
}

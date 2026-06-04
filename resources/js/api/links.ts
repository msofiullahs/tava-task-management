import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { ProjectKey } from './projects';
import type { Task, TaskLink, TaskLinkType } from '../types';

export function useTaskLinks(taskId: number | undefined) {
  return useQuery({
    queryKey: ['tasks', taskId, 'links'],
    queryFn: async () =>
      (await http.get<{ data: TaskLink[] }>(`/tasks/${taskId}/links`)).data.data,
    enabled: taskId !== undefined,
  });
}

interface CreateLinkArgs {
  /** Source task — the link is registered from this one's perspective. For "Blocked by X" the SPA flips source/target. */
  taskId: number;
  target_task_id: number;
  type: TaskLinkType;
}

export function useCreateTaskLink(projectKey?: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, target_task_id, type }: CreateLinkArgs) =>
      (await http.post<{ link: TaskLink }>(`/tasks/${taskId}/links`, { target_task_id, type })).data.link,
    onSuccess: (_link, vars) => {
      // Both sides need their cached link list invalidated.
      qc.invalidateQueries({ queryKey: ['tasks', vars.taskId, 'links'] });
      qc.invalidateQueries({ queryKey: ['tasks', vars.target_task_id, 'links'] });
      if (projectKey) qc.invalidateQueries({ queryKey: ['projects', projectKey, 'tasks'] });
    },
  });
}

export function useDeleteTaskLink(taskId: number, projectKey?: ProjectKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: number) => {
      await http.delete(`/links/${linkId}`);
      return linkId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', taskId, 'links'] });
      // Also nuke any other task's link list in this project — cheaper than tracking the other side.
      if (projectKey) qc.invalidateQueries({ queryKey: ['projects', projectKey, 'tasks'] });
    },
  });
}

/** Convenience subtask creation — backend inherits project + default status. */
export function useCreateSubtask(projectKey: ProjectKey, parentTaskId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description?: string | null }) =>
      (await http.post<{ task: Task }>(`/tasks/${parentTaskId}/subtasks`, payload)).data.task,
    onSuccess: () => {
      // Refresh the project task list so the new subtask shows up everywhere.
      qc.invalidateQueries({ queryKey: ['projects', projectKey, 'tasks'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { Comment } from '../types';

export function useComments(taskId: number | undefined) {
  return useQuery({
    queryKey: ['tasks', taskId, 'comments'],
    queryFn: async () =>
      (await http.get<{ data: Comment[] }>(`/tasks/${taskId}/comments`)).data.data,
    enabled: taskId !== undefined,
  });
}

export function useCreateComment(taskId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      (await http.post<{ comment: Comment }>(`/tasks/${taskId}/comments`, { body })).data.comment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', taskId, 'comments'] }),
  });
}

export function useDeleteComment(taskId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: number) => {
      await http.delete(`/comments/${commentId}`);
      return commentId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', taskId, 'comments'] }),
  });
}

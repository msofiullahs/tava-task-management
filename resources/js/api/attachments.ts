import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { ProjectKey } from './projects';
import type { Attachment } from '../types';

interface UploadArgs {
  file: File;
  attachable_type: 'task' | 'comment';
  attachable_id: number;
  /** Uuid of the parent task's project — only needed so the right tasks query gets invalidated. */
  projectKey?: ProjectKey;
}

/** Global media browser (Files page). */
export function useAllAttachments() {
  return useQuery({
    queryKey: ['attachments'],
    queryFn: async () => (await http.get<{ data: Attachment[] }>('/attachments')).data.data,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, attachable_type, attachable_id }: UploadArgs) => {
      const form = new FormData();
      form.append('file', file);
      form.append('attachable_type', attachable_type);
      form.append('attachable_id', String(attachable_id));
      const res = await http.post<{ attachment: Attachment }>('/attachments', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.attachment;
    },
    onSuccess: (_att, vars) => {
      qc.invalidateQueries({ queryKey: ['attachments'] });
      if (vars.projectKey) {
        qc.invalidateQueries({ queryKey: ['projects', vars.projectKey, 'tasks'] });
      }
      // Comments are keyed by task id which we usually have via the page that triggered the upload.
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/attachments/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

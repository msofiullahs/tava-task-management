import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/axios';
import type { Role, User } from '../types';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => (await http.get<{ data: User[] }>('/users')).data.data,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; role: Role }) =>
      (await http.post<{ user: User; temp_password: string }>('/users', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; name?: string; email?: string; role?: Role }) =>
      (await http.patch<{ user: User }>(`/users/${id}`, payload)).data.user,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await http.post<{ user: User; temp_password: string }>(`/users/${id}/reset-password`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/users/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http, { ensureCsrf } from '../lib/axios';
import type { PasswordResetRequestRow, User } from '../types';

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await ensureCsrf();
      const res = await http.post<{ message: string }>('/password/forgot', { email });
      return res.data;
    },
  });
}

export function usePasswordResetRequests() {
  return useQuery({
    queryKey: ['password-requests'],
    queryFn: async () =>
      (await http.get<{ data: PasswordResetRequestRow[] }>('/password/requests')).data.data,
  });
}

export function useFulfillPasswordRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await http.post<{ user: User; temp_password: string }>(`/password/requests/${id}/fulfill`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['password-requests'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDismissPasswordRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/password/requests/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['password-requests'] }),
  });
}

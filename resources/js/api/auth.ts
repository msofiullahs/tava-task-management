import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http, { ensureCsrf } from '../lib/axios';
import type { Theme, User } from '../types';

interface LoginPayload { email: string; password: string; remember?: boolean }
interface SetupPayload { name: string; email: string; password: string; password_confirmation: string; seed_sample?: boolean }
interface ChangePasswordPayload { current_password?: string; password: string; password_confirmation: string }

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup', 'status'],
    queryFn: async () => (await http.get<{ needs_setup: boolean }>('/setup/status')).data,
    staleTime: Infinity,
  });
}

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const res = await http.get<{ user: User }>('/user');
        return res.data.user;
      } catch (err) {
        // 401 is the steady state when signed out — turn it into null instead of an error.
        return null;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      await ensureCsrf();
      const res = await http.post<{ user: User }>('/login', payload);
      return res.data.user;
    },
    onSuccess: (user) => {
      qc.setQueryData(['user'], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await http.post('/logout');
    },
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SetupPayload) => {
      await ensureCsrf();
      const res = await http.post<{ user: User }>('/setup', payload);
      return res.data.user;
    },
    onSuccess: (user) => {
      qc.setQueryData(['user'], user);
      qc.setQueryData(['setup', 'status'], { needs_setup: false });
    },
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const res = await http.post<{ user: User }>('/user/password', payload);
      return res.data.user;
    },
    onSuccess: (user) => qc.setQueryData(['user'], user),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { theme?: Theme }) => {
      const res = await http.patch<{ user: User }>('/user/preferences', payload);
      return res.data.user;
    },
    onSuccess: (user) => qc.setQueryData(['user'], user),
  });
}

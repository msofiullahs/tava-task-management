import { QueryClient } from '@tanstack/react-query';

// Spec §10.5 — without WebSockets, "feels live enough" comes from refetchOnWindowFocus
// plus precise cache invalidation in every mutation hook.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

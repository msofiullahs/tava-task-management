import { AxiosError } from 'axios';

/**
 * Pull a human message out of an axios error response.
 * Spec §9.6 — no raw HTTP codes or 422 bodies in the UI.
 */
export function humanError(err: unknown, fallback = 'Something didn\'t work. Please try again.'): string {
  if (err instanceof AxiosError && err.response) {
    const data = err.response.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.errors) {
      const first = Object.values(data.errors)[0];
      if (first && first.length) return first[0];
    }
    if (data?.message) return data.message;
  }
  return fallback;
}

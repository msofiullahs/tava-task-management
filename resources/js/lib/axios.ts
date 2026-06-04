import axios from 'axios';

// Sanctum SPA mode (spec §5) — same-origin, cookie-based session.
// Axios reads the XSRF-TOKEN cookie automatically and echoes it in X-XSRF-TOKEN.
const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

let csrfFetched = false;

/** Sanctum requires hitting /sanctum/csrf-cookie once before the first mutating call. */
export async function ensureCsrf(): Promise<void> {
  if (csrfFetched) return;
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
  csrfFetched = true;
}

export default http;

// Shared TS types — mirror the API Resources in app/Http/Resources/.

export type Role = 'admin' | 'member' | 'guest';
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type Theme = 'light' | 'dark' | 'system';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  must_change_password: boolean;
  theme: Theme | null;
  created_at: string;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
}

export interface Status {
  id: number;
  project_id: number;
  name: string;
  color: string;
  position: string;
  is_default: boolean;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  position: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  statuses?: Status[];
  task_count?: number;
  members?: UserSummary[];
  member_count?: number;
  /** True iff the project is restricted (at least one explicit member set). */
  is_restricted?: boolean;
}

export interface Task {
  id: number;
  project_id: number;
  status_id: number;
  parent_id: number | null;
  title: string;
  description: string | null;
  priority: Priority | null;
  due_date: string | null; // ISO date (YYYY-MM-DD)
  position: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  assignees?: UserSummary[];
  comment_count?: number;
  attachment_count?: number;
  attachments?: Attachment[];
}

export interface Comment {
  id: number;
  task_id: number;
  body: string;
  user: UserSummary;
  attachments?: Attachment[];
  created_at: string;
}

export interface Attachment {
  id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  is_image: boolean;
  url: string;
  created_at: string;
  uploader?: UserSummary;
  attachable_type: 'task' | 'comment' | 'unknown';
  attachable_id: number;
  /** Set on the global Files-page payload; null on per-task/comment embedded attachments. */
  source: { label: string; project_id: number | null; task_id: number | null } | null;
}

export interface PasswordResetRequestRow {
  id: number;
  email: string;
  user: { id: number; name: string; role: Role } | null;
  created_at: string;
}

/** Role labels shown in the UI — see spec §6 (DB enum vs display). */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  member: 'Member',
  guest: 'Viewer',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  normal: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  low: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

/** Solid swatch hex per priority — used by the coloured Select dot. */
export const PRIORITY_DOT: Record<Priority, string> = {
  urgent: '#e11d48',
  high: '#f59e0b',
  normal: '#64748b',
  low: '#94a3b8',
};

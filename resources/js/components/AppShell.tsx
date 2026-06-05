import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, FolderKanban, Lock, LogOut, Menu, Paperclip, Users, UserCircle, type LucideIcon } from 'lucide-react';
import { useCurrentUser, useLogout } from '../api/auth';
import { useProjects } from '../api/projects';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { ROLE_LABELS } from '../types';
import clsx from 'clsx';

/** Sidebar nav entry — left bar lights up when active so the page sense is obvious at a glance. */
function SidebarLink({ to, icon: Icon, label, end }: { to: string; icon: LucideIcon; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-indigo-500" />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser();
  const { data: projects = [] } = useProjects();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (!user) return null;

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            <Logo className="h-7 w-7" />
            <span>Tava</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          <SidebarLink to="/" end icon={FolderKanban} label="Projects" />
          {user.role !== 'guest' && <SidebarLink to="/files" icon={Paperclip} label="Files" />}
          {user.role === 'admin' && <SidebarLink to="/people" icon={Users} label="People" />}

          <div className="mt-5 flex items-center justify-between px-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Projects</span>
            <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {projects.length}
            </span>
          </div>
          {projects.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-500">No projects yet.</div>
          )}
          {projects.map((p) => (
            <NavLink
              key={p.id}
              to={`/projects/${p.uuid}`}
              className={({ isActive }) =>
                clsx(
                  'group relative flex items-center gap-2 truncate rounded-md px-3 py-1.5 text-sm transition',
                  isActive
                    ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                )
              }
            >
              {p.is_restricted && (
                <Lock className="h-3 w-3 shrink-0 text-slate-400" aria-label="Restricted" />
              )}
              <span className="truncate">{p.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 lg:px-6">
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Avatar name={user.name} src={user.avatar_url} size="sm" />
                <span className="hidden text-sm text-slate-700 dark:text-slate-200 sm:inline">{user.name}</span>
                <ChevronDown className={clsx('hidden h-3.5 w-3.5 text-slate-400 transition sm:inline', menuOpen && 'rotate-180')} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-100/5">
                  <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <Avatar name={user.name} src={user.avatar_url} size="md" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                      <div className="truncate text-xs text-slate-500">{user.email}</div>
                      <div className="mt-1 inline-flex rounded bg-indigo-50 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                        {ROLE_LABELS[user.role]}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); navigate('/account'); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <UserCircle className="h-4 w-4 text-slate-400" />
                    Account & password
                  </button>
                  <button
                    type="button"
                    onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <LogOut className="h-4 w-4 text-slate-400" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

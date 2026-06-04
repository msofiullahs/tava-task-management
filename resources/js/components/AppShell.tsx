import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../api/auth';
import { useProjects } from '../api/projects';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { ROLE_LABELS } from '../types';
import clsx from 'clsx';

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
        <nav className="flex flex-col gap-1 p-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              clsx(
                'rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )
            }
          >
            Projects
          </NavLink>
          {user.role !== 'guest' && (
            <NavLink
              to="/files"
              className={({ isActive }) =>
                clsx(
                  'rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              Files
            </NavLink>
          )}
          {user.role === 'admin' && (
            <NavLink
              to="/people"
              className={({ isActive }) =>
                clsx(
                  'rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              People
            </NavLink>
          )}

          <div className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Projects</div>
          {projects.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-500">No projects yet.</div>
          )}
          {projects.map((p) => (
            <NavLink
              key={p.id}
              to={`/projects/${p.uuid}`}
              className={({ isActive }) =>
                clsx(
                  'truncate rounded-md px-3 py-1.5 text-sm',
                  isActive
                    ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                )
              }
            >
              {p.name}
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
            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Avatar name={user.name} size="sm" />
                <span className="hidden text-sm text-slate-700 dark:text-slate-200 sm:inline">{user.name}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                    <div className="mt-1 inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {ROLE_LABELS[user.role]}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); navigate('/account'); }}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Account & password
                  </button>
                  <button
                    type="button"
                    onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 6h12M4 10h12M4 14h12" strokeLinecap="round" />
    </svg>
  );
}

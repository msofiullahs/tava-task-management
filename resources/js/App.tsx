import { type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useCurrentUser, useSetupStatus } from './api/auth';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectPage } from './pages/ProjectPage';
import { AccountPage } from './pages/AccountPage';
import { PeoplePage } from './pages/PeoplePage';
import { FilesPage } from './pages/FilesPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AppShell } from './components/AppShell';

export function App() {
  const { data: setupStatus, isLoading: setupLoading } = useSetupStatus();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const location = useLocation();

  if (setupLoading || userLoading) {
    return <FullScreenLoading />;
  }

  // Spec §5 — first-run wizard takes priority on a fresh install.
  if (setupStatus?.needs_setup && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }
  if (!setupStatus?.needs_setup && location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell><ProjectsPage /></AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:projectKey"
        element={
          <RequireAuth>
            <AppShell><ProjectPage /></AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/account"
        element={
          <RequireAuth>
            <AppShell><AccountPage /></AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/files"
        element={
          <RequireAuth>
            <AppShell><FilesPage /></AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/people"
        element={
          <RequireAuth adminOnly>
            <AppShell><PeoplePage /></AppShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireAuth({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { data: user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) return <FullScreenLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // Spec §5 — temp-password users get pushed to the change-password screen until they update.
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function FullScreenLoading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">
      Loading Tava…
    </div>
  );
}

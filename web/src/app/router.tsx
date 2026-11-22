import { createBrowserRouter } from 'react-router-dom'
import { UsersPage } from '@/features/admin/UsersPage'
import { RedirectIfAuthenticated, RequireAuth, RequireRole } from '@/features/auth/guards'
import { ForgotPasswordPage, LoginPage } from '@/features/auth/LoginPage'
import { ProfilePage } from '@/features/auth/ProfilePage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/home/HomePage'
import { ComingSoonPage, NotFoundPage } from '@/features/home/StatusPages'
import { AppLayout } from './AppLayout'

/**
 * Every feature mounts its routes here. Visitors only see "/" and the auth pages;
 * everything under RequireAuth needs a session, RequireRole narrows it further.
 */
export const router = createBrowserRouter([
  { path: '/login', element: <RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated> },
  // no RedirectIfAuthenticated: the wizard's last step runs logged in; RegisterPage redirects by itself before that
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'profile', element: <ProfilePage /> },
          // Aymen's datasets pages, loaded on demand (they bring the charts library)
          { path: 'datasets', lazy: async () => ({ Component: (await import('@/features/datasets')).DatasetsPage }) },
          { path: 'datasets/:id', lazy: async () => ({ Component: (await import('@/features/datasets')).DatasetDetailPage }) },
          { path: 'players', element: <ComingSoonPage title="Joueurs" sprint="Sprint 2" text="Recherche, fiche joueur avec radar et comparaison." /> },
          { path: 'galaxy', element: <ComingSoonPage title="Player Galaxy" sprint="Sprint 3" text="La carte interactive des profils de jeu, calculée par UMAP et HDBSCAN." /> },
          { path: 'copilot', element: <ComingSoonPage title="Scout Copilot" sprint="Sprint 3" text="L’assistant qui cherche dans les rapports des scouts et cite ses sources." /> },
          {
            element: <RequireRole roles={['ADMIN']} />,
            children: [{ path: 'admin/users', element: <UsersPage /> }],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

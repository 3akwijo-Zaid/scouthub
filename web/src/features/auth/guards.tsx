import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageSpinner } from '@/ui'
import { hasRole, useSession } from './session'
import type { Role } from './types'

/** Children (or nested routes) only for logged-in users; others go to /login and come back after. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const status = useSession((s) => s.status)
  const location = useLocation()
  if (status === 'checking') return <PageSpinner label="Vérification de la session…" />
  if (status === 'anonymous') {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return children ? <>{children}</> : <Outlet />
}

/** Children (or nested routes) only for the given roles; others see an explanation, not a blank page. */
export function RequireRole({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const user = useSession((s) => s.user)
  if (!hasRole(user, ...roles)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="sh-label">Erreur 403</p>
        <h1 className="mt-2 text-4xl font-bold">Accès réservé</h1>
        <p className="mt-3 text-muted">Votre rôle ne permet pas d’ouvrir cette page. Un administrateur peut modifier votre rôle.</p>
        <Link to="/" className="mt-6 inline-block text-accent hover:underline">Retour à l’accueil</Link>
      </div>
    )
  }
  return children ? <>{children}</> : <Outlet />
}

/** Login / register pages: a logged-in user is sent to where they were going. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status)
  const location = useLocation()
  if (status === 'authenticated') {
    return <Navigate to={safeNext(new URLSearchParams(location.search).get('next'))} replace />
  }
  return <>{children}</>
}

/** Only same-app paths are allowed as a post-login destination (no open redirect). */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

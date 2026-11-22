import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { hasRole, useSession } from '@/features/auth/session'
import type { Role, User } from '@/features/auth/types'
import { Badge, Logo, ROLE_LABELS, cx } from '@/ui'

interface NavItem {
  to: string
  label: string
  /** Roles allowed to see it; undefined = every logged-in user. */
  roles?: Role[]
  soon?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/players', label: 'Joueurs', soon: true },
  { to: '/galaxy', label: 'Player Galaxy', soon: true },
  { to: '/copilot', label: 'Scout Copilot', soon: true },
  { to: '/datasets', label: 'Datasets' },
  { to: '/admin/users', label: 'Utilisateurs', roles: ['ADMIN'] },
]

/** Application shell: sidebar navigation (drawer on phones), top bar with the account menu, page outlet. */
export function AppLayout() {
  const user = useSession((s) => s.user)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setDrawerOpen(false), [location.pathname])

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[248px_1fr]">
      {/* sidebar: fixed drawer on phones, static column on large screens */}
      <aside
        id="sh-sidebar"
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line/10 bg-surface p-4 transition-transform lg:static lg:w-auto lg:translate-x-0',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Link to="/" className="px-2 py-1" aria-label="Accueil ScoutHub"><Logo /></Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navigation principale">
          {user
            ? NAV.filter((item) => !item.roles || hasRole(user, ...item.roles)).map((item) => <SideLink key={item.to} item={item} />)
            : <SideLink item={{ to: '/', label: 'Accueil' }} />}
        </nav>
        <p className="px-2 text-xs text-muted/70">ScoutHub · Sprint 1</p>
      </aside>
      {drawerOpen && (
        <button className="fixed inset-0 z-30 bg-bg/70 lg:hidden" aria-label="Fermer le menu" onClick={() => setDrawerOpen(false)} />
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line/10 bg-bg/85 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-muted hover:bg-raised hover:text-fg lg:hidden"
            aria-label="Ouvrir le menu" aria-controls="sh-sidebar" aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <Link to="/" className="lg:hidden" aria-label="Accueil ScoutHub"><Logo withName={false} /></Link>
          <div className="ml-auto flex items-center gap-2">
            {user ? <AccountMenu user={user} /> : (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-fg">Se connecter</Link>
                <Link to="/register" className="rounded-lg bg-action px-3 py-2 text-sm font-semibold text-white hover:brightness-110">Créer un compte</Link>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => cx(
        'flex items-center justify-between rounded-lg px-3 py-2 font-medium transition',
        isActive ? 'bg-raised text-fg shadow-[inset_2px_0_0_rgb(var(--sh-accent))]' : 'text-muted hover:bg-raised/60 hover:text-fg',
      )}
    >
      {item.label}
      {item.soon && <Badge className="text-[10px]">Bientôt</Badge>}
    </NavLink>
  )
}

function AccountMenu({ user }: { user: User }) {
  const logout = useSession((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = (user.fullName ?? user.email).split(/[\s@.]+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-3 hover:bg-raised">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">{initials}</span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[180px] truncate text-sm font-medium">{user.fullName ?? user.email}</span>
          <span className="block text-xs text-muted">{ROLE_LABELS[user.role]}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="sh-card absolute right-0 mt-2 w-56 p-1.5 shadow-xl shadow-black/40">
          <p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p>
          <Link role="menuitem" to="/profile" onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm hover:bg-raised">Mon compte</Link>
          <button role="menuitem" onClick={() => { logout(); navigate('/login') }}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">Se déconnecter</button>
        </div>
      )}
    </div>
  )
}

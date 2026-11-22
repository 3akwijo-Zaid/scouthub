import { useCallback, useEffect, useState } from 'react'
import { api, toApiError } from '@/lib/api'
import { useSession } from '@/features/auth/session'
import type { Role, User } from '@/features/auth/types'
import { Alert, Badge, Button, PageSpinner, ROLE_LABELS, cx } from '@/ui'

const ROLES: Role[] = ['SCOUT', 'RECRUITER', 'ANALYST', 'ADMIN']
const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
const formatDay = (iso: string | null) => (iso ? day.format(new Date(iso)) : 'Jamais')

/** User and role management (ADMIN): GET /users, PATCH /users/{id}. */
export function UsersPage() {
  const me = useSession((s) => s.user)
  const [users, setUsers] = useState<User[] | null>(null)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async (q: string, r: Role | '') => {
    try {
      const { data } = await api.get<User[]>('/users', { params: { q: q || undefined, role: r || undefined } })
      setUsers(data)
      setError(null)
    } catch (err) {
      setError(toApiError(err).message)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void load(query, role), 250)
    return () => clearTimeout(timer)
  }, [query, role, load])

  async function update(user: User, patch: Partial<Pick<User, 'role' | 'enabled'>>) {
    setBusyId(user.id)
    try {
      const { data } = await api.patch<User>(`/users/${user.id}`, patch)
      setUsers((list) => list?.map((u) => (u.id === data.id ? data : u)) ?? null)
      setError(null)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sh-label">Administration</p>
          <h1 className="mt-1 text-4xl font-bold">Utilisateurs et rôles</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Les nouveaux comptes sont Scouts. Changez un rôle ou désactivez un compte : l’effet est immédiat, sans attendre que la personne se reconnecte.
          </p>
        </div>
        {users && <Badge>{users.length} compte{users.length > 1 ? 's' : ''}</Badge>}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="users-search">Rechercher</label>
        <input id="users-search" className="sh-input sm:max-w-sm" placeholder="Rechercher un nom ou un e-mail"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="sr-only" htmlFor="users-role">Filtrer par rôle</label>
        <select id="users-role" className="sh-input sm:w-52" value={role} onChange={(e) => setRole(e.target.value as Role | '')}>
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {!users ? (
        <PageSpinner />
      ) : users.length === 0 ? (
        <p className="sh-card p-8 text-center text-muted">Aucun compte ne correspond à cette recherche.</p>
      ) : (
        <div className="sh-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line/15 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Inscrit</th>
                <th className="px-4 py-3 font-medium">Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === me?.id
                const busy = busyId === u.id
                return (
                  <tr key={u.id} className={cx('border-b border-line/10 last:border-0', !u.enabled && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.fullName ?? '—'} {isMe && <span className="text-xs text-muted">(vous)</span>}</p>
                      <p className="text-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <label className="sr-only" htmlFor={`role-${u.id}`}>Rôle de {u.email}</label>
                      <select id={`role-${u.id}`} className="sh-input w-40 py-1.5" value={u.role} disabled={isMe || busy}
                        title={isMe ? 'Vous ne pouvez pas changer votre propre rôle.' : undefined}
                        onChange={(e) => void update(u, { role: e.target.value as Role })}>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={cx('inline-flex items-center gap-1.5', u.enabled ? 'text-accent' : 'text-danger')}>
                          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                          {u.enabled ? 'Actif' : 'Désactivé'}
                        </span>
                        {!isMe && (
                          <Button size="sm" variant={u.enabled ? 'danger' : 'secondary'} loading={busy}
                            onClick={() => void update(u, { enabled: !u.enabled })}>
                            {u.enabled ? 'Désactiver' : 'Réactiver'}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">{formatDay(u.createdAt)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted">{formatDay(u.lastLoginAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

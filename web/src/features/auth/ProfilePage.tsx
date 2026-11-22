import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { api, toApiError, type ApiError } from '@/lib/api'
import { Alert, Button, Field, RoleBadge } from '@/ui'
import { useSession } from './session'
import type { User } from './types'

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
const formatDate = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : '—')

export function ProfilePage() {
  const user = useSession((s) => s.user)
  if (!user) return null
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="sh-label">Mon compte</p>
        <h1 className="mt-1 text-4xl font-bold">{user.fullName ?? user.email}</h1>
      </header>

      <section className="sh-card grid gap-4 p-5 sm:grid-cols-2">
        <Info label="E-mail">{user.email}</Info>
        <Info label="Rôle"><RoleBadge role={user.role} /></Info>
        <Info label="Membre depuis">{formatDate(user.createdAt)}</Info>
        <Info label="Dernière connexion">{formatDate(user.lastLoginAt)}</Info>
      </section>

      <NameForm user={user} />
      <PasswordForm />
    </div>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="sh-label">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function NameForm({ user }: { user: User }) {
  const setUser = useSession((s) => s.setUser)
  const [fullName, setFullName] = useState(user.fullName ?? '')
  const [state, setState] = useState<{ saving: boolean; error: ApiError | null; saved: boolean }>({ saving: false, error: null, saved: false })
  const unchanged = fullName.trim() === (user.fullName ?? '')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setState({ saving: true, error: null, saved: false })
    try {
      const { data } = await api.put<User>('/auth/me', { fullName: fullName.trim() })
      setUser(data)
      setState({ saving: false, error: null, saved: true })
    } catch (err) {
      setState({ saving: false, error: toApiError(err), saved: false })
    }
  }

  return (
    <form onSubmit={onSubmit} className="sh-card flex flex-col gap-4 p-5">
      <h2 className="text-2xl font-bold">Profil</h2>
      {state.error && <Alert tone="danger">{state.error.message}</Alert>}
      {state.saved && <Alert tone="success">Nom enregistré.</Alert>}
      <Field id="profile-name" label="Nom complet" autoComplete="name" maxLength={150} value={fullName}
        onChange={(e) => { setFullName(e.target.value); setState((s) => ({ ...s, saved: false })) }}
        error={state.error?.fields.fullName} />
      <div><Button type="submit" variant="secondary" loading={state.saving} disabled={unchanged}>Enregistrer</Button></div>
    </form>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [state, setState] = useState<{ saving: boolean; error: ApiError | null; saved: boolean }>({ saving: false, error: null, saved: false })
  const mismatch = form.confirm.length > 0 && form.confirm !== form.newPassword
  const canSubmit = form.currentPassword && form.newPassword.length >= 8 && form.newPassword === form.confirm

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setState({ saving: true, error: null, saved: false })
    try {
      await api.put('/auth/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setState({ saving: false, error: null, saved: true })
    } catch (err) {
      setState({ saving: false, error: toApiError(err), saved: false })
    }
  }

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.value })
    setState((s) => ({ ...s, saved: false }))
  }

  return (
    <form onSubmit={onSubmit} className="sh-card flex flex-col gap-4 p-5">
      <h2 className="text-2xl font-bold">Mot de passe</h2>
      {state.error && <Alert tone="danger">{state.error.message}</Alert>}
      {state.saved && <Alert tone="success">Mot de passe modifié.</Alert>}
      <Field id="pw-current" label="Mot de passe actuel" type="password" autoComplete="current-password"
        value={form.currentPassword} onChange={set('currentPassword')} error={state.error?.fields.currentPassword} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pw-new" label="Nouveau mot de passe" type="password" autoComplete="new-password" maxLength={72}
          hint="8 caractères minimum." value={form.newPassword} onChange={set('newPassword')} error={state.error?.fields.newPassword} />
        <Field id="pw-confirm" label="Confirmer" type="password" autoComplete="new-password" maxLength={72}
          value={form.confirm} onChange={set('confirm')} error={mismatch ? 'Ne correspond pas.' : undefined} />
      </div>
      <div><Button type="submit" variant="secondary" loading={state.saving} disabled={!canSubmit}>Changer le mot de passe</Button></div>
    </form>
  )
}

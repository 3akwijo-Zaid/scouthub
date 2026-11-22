import { create } from 'zustand'
import { api, setUnauthorizedHandler, TOKEN_KEY } from '@/lib/api'
import type { AuthResponse, RegisterPayload, Role, User } from './types'

/**
 * Session store: who is logged in, with which token, until when.
 * Persisted in localStorage so a reload keeps the user logged in; the profile is refreshed
 * from GET /auth/me on start-up so a role changed by an admin shows up without logging out.
 */
const SESSION_KEY = 'scouthub.session'
/** "0" when the user unticked "Rester connecté": the session must not survive closing the browser. */
const REMEMBER_KEY = 'scouthub.remember'
/** sessionStorage marker: present while this browser session is open. */
const ALIVE_KEY = 'scouthub.alive'

type Status = 'checking' | 'authenticated' | 'anonymous'

interface Stored {
  token: string
  expiresAt: string
  user: User
}

interface SessionState {
  status: Status
  user: User | null
  expiresAt: string | null
  /** Why the user was sent back to the login page (shown there once). */
  notice: string | null
  /** `remember = false` ends the session when the browser is closed. */
  login: (email: string, password: string, remember?: boolean) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: (notice?: string) => void
  refresh: () => Promise<void>
  setUser: (user: User) => void
  clearNotice: () => void
}

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Stored
    if (!stored.token || new Date(stored.expiresAt).getTime() <= Date.now()) return null
    // "Rester connecté" unticked and the browser was closed since: the session is over
    if (localStorage.getItem(REMEMBER_KEY) === '0' && !sessionStorage.getItem(ALIVE_KEY)) return null
    return stored
  } catch {
    return null
  }
}

function save(stored: Stored | null) {
  try {
    if (stored) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(stored))
      localStorage.setItem(TOKEN_KEY, stored.token)
    } else {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REMEMBER_KEY)
    }
  } catch {
    // storage blocked (private mode): the session simply lasts until the tab is closed
  }
}

let expiryTimer: ReturnType<typeof setTimeout> | undefined

function scheduleExpiry(expiresAt: string | null) {
  clearTimeout(expiryTimer)
  if (!expiresAt) return
  // setTimeout overflows past ~24.8 days; tokens are much shorter-lived
  const delay = Math.min(new Date(expiresAt).getTime() - Date.now(), 2 ** 31 - 1)
  expiryTimer = setTimeout(() => useSession.getState().logout('Votre session a expiré, reconnectez-vous.'), Math.max(delay, 0))
}

const initial = load()
if (!initial) save(null) // drop an expired session left in storage

export const useSession = create<SessionState>((set, get) => {
  const start = (response: AuthResponse, remember = true) => {
    save({ token: response.token, expiresAt: response.expiresAt, user: response.user })
    try {
      localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
      sessionStorage.setItem(ALIVE_KEY, '1')
    } catch {
      // storage blocked: nothing to remember anyway
    }
    scheduleExpiry(response.expiresAt)
    set({ status: 'authenticated', user: response.user, expiresAt: response.expiresAt, notice: null })
    return response.user
  }

  return {
    status: initial ? 'checking' : 'anonymous',
    user: initial?.user ?? null,
    expiresAt: initial?.expiresAt ?? null,
    notice: null,

    async login(email, password, remember = true) {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
      return start(data, remember)
    },

    async register(payload) {
      const { data } = await api.post<AuthResponse>('/auth/register', payload)
      return start(data)
    },

    logout(notice) {
      save(null)
      scheduleExpiry(null)
      set({ status: 'anonymous', user: null, expiresAt: null, notice: notice ?? null })
    },

    async refresh() {
      const stored = load()
      if (!stored) {
        get().logout()
        return
      }
      try {
        const { data } = await api.get<User>('/auth/me')
        save({ ...stored, user: data })
        scheduleExpiry(stored.expiresAt)
        set({ status: 'authenticated', user: data })
      } catch {
        // 401 is handled by the unauthorized handler; offline keeps the cached profile
        if (get().status === 'checking') set({ status: get().user ? 'authenticated' : 'anonymous' })
      }
    },

    setUser(user) {
      const stored = load()
      if (stored) save({ ...stored, user })
      set({ user })
    },

    clearNotice() {
      set({ notice: null })
    },
  }
})

setUnauthorizedHandler(() => {
  if (useSession.getState().status !== 'anonymous') {
    useSession.getState().logout('Votre session a expiré ou votre compte a été modifié, reconnectez-vous.')
  }
})

/** True when the logged-in user has one of `roles`. */
export function hasRole(user: User | null, ...roles: Role[]): boolean {
  return !!user && roles.includes(user.role)
}

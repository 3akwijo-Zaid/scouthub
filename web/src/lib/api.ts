import axios, { AxiosError } from 'axios'

/**
 * Shared HTTP client for every feature: base URL /api (Vite proxy in dev, Nginx in prod),
 * JWT on every request, and a single place that reacts to an expired session.
 *
 * The token lives in localStorage under TOKEN_KEY, which the datasets client also reads.
 */
export const TOKEN_KEY = 'scouthub.token'

export const api = axios.create({ baseURL: '/api' })

let onUnauthorized: (() => void) | null = null

/** Called once by the session store: what to do when the API rejects our token. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = readToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(undefined, (error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 401) {
    const url = error.config?.url ?? ''
    const sentToken = Boolean(error.config?.headers?.Authorization)
    // a wrong password on /auth/login is not an expired session
    if (sentToken && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) onUnauthorized?.()
  }
  return Promise.reject(error)
})

/** RFC 7807 body returned by the backend for every error. */
export interface Problem {
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string>
}

export interface ApiError {
  status: number | null
  message: string
  /** Per-field messages from a 400 validation error, keyed by field name. */
  fields: Record<string, string>
}

/** Turns anything thrown by `api` into a message the UI can show as is. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null
    const problem = error.response?.data as Problem | undefined
    if (!error.response) return { status, message: 'Serveur injoignable. Vérifiez votre connexion.', fields: {} }
    return {
      status,
      message: problem?.detail ?? 'Une erreur inattendue est survenue.',
      fields: problem?.errors ?? {},
    }
  }
  return { status: null, message: 'Une erreur inattendue est survenue.', fields: {} }
}

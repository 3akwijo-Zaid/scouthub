// Mirrors docs/api/openapi.yaml (Auth & users)

export type Role = 'ADMIN' | 'ANALYST' | 'SCOUT' | 'RECRUITER'

export interface User {
  id: string
  email: string
  fullName: string | null
  role: Role
  enabled: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface AuthResponse {
  token: string
  expiresAt: string
  user: User
}

export interface RegisterPayload {
  email: string
  password: string
  fullName?: string
}

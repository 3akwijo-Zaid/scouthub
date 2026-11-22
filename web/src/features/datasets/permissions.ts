import { hasRole } from '@/features/auth/session'
import type { User } from '@/features/auth/types'

/**
 * Same rules as DatasetController, so the pages only offer what the API will accept:
 * analysts and admins import; a dataset is deleted by its owner (an analyst) or by an admin.
 */
export function canImportDatasets(user: User | null): boolean {
  return hasRole(user, 'ANALYST', 'ADMIN')
}

export function canDeleteDataset(user: User | null, ownerEmail: string | null): boolean {
  if (!user) return false
  if (hasRole(user, 'ADMIN')) return true
  return hasRole(user, 'ANALYST') && !!ownerEmail && ownerEmail.toLowerCase() === user.email.toLowerCase()
}

// Client-side checks, mirroring the backend rules so most mistakes are caught before a round trip.

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72 // bcrypt reads at most 72 bytes; the API refuses longer passwords

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function checkEmail(value: string): string | undefined {
  if (!value.trim()) return 'Saisissez votre adresse e-mail.'
  if (!EMAIL.test(value.trim())) return 'Cette adresse e-mail n’est pas valide, vérifiez-la.'
  return undefined
}

export function checkNewPassword(value: string): string | undefined {
  if (!value) return 'Choisissez un mot de passe.'
  if (value.length < PASSWORD_MIN) return `Le mot de passe doit faire au moins ${PASSWORD_MIN} caractères.`
  if (value.length > PASSWORD_MAX) return `Le mot de passe doit faire au plus ${PASSWORD_MAX} caractères.`
  return undefined
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>

/** First field (in form order) that has an error, to move focus there. */
export function firstInvalid<K extends string>(order: K[], errors: FieldErrors<K>): K | undefined {
  return order.find((key) => errors[key])
}

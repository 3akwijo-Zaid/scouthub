import { forwardRef, type ReactNode } from 'react'
import type { Role } from '@/features/auth/types'
import { cx } from './cx'

type Tone = 'danger' | 'success' | 'info' | 'warn'

const ALERT: Record<Tone, string> = {
  danger: 'border-danger/40 bg-danger/10 text-danger',
  success: 'border-accent/40 bg-accent/10 text-accent',
  info: 'border-info/40 bg-info/10 text-info',
  warn: 'border-warn/40 bg-warn/10 text-warn',
}

/** Message block; focusable (tabIndex -1) so a form can move focus to it after a failed submit. */
export const Alert = forwardRef<HTMLDivElement, { tone?: Tone; children: ReactNode; className?: string }>(function Alert(
  { tone = 'info', children, className },
  ref,
) {
  return (
    <div ref={ref} tabIndex={-1} role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('rounded-lg border px-4 py-3 text-sm leading-relaxed focus:outline-none', ALERT[tone], className)}>
      {children}
    </div>
  )
})

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center rounded-full border border-line/25 px-2 py-0.5 text-xs font-medium text-muted', className)}>
      {children}
    </span>
  )
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  ANALYST: 'Analyste',
  SCOUT: 'Scout',
  RECRUITER: 'Recruteur',
}

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'border-danger/40 text-danger',
  ANALYST: 'border-info/40 text-info',
  SCOUT: 'border-accent/40 text-accent',
  RECRUITER: 'border-warn/40 text-warn',
}

export function RoleBadge({ role }: { role: Role }) {
  return <Badge className={ROLE_STYLES[role]}>{ROLE_LABELS[role]}</Badge>
}

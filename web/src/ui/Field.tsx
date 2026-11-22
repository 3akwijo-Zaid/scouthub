import { forwardRef, useId, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: ReactNode
  /** Shown at the right of the label, e.g. a "Mot de passe oublié ?" link. */
  labelAction?: ReactNode
}

/**
 * Labelled input with hint and error wired for screen readers.
 * Email fields get the right keyboard and no autocorrect; password fields get a show/hide eye
 * and a caps-lock warning.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, labelAction, id, className, type, onKeyUp, onKeyDown, onBlur, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [revealed, setRevealed] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const isPassword = type === 'password'
  const isEmail = type === 'email'
  const toggleLabel = revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
  const showCaps = isPassword && capsLock && !revealed
  const describedBy = [hint && `${inputId}-hint`, showCaps && `${inputId}-caps`, error && `${inputId}-error`]
    .filter(Boolean).join(' ') || undefined

  const trackCaps = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isPassword && typeof e.getModifierState === 'function') setCapsLock(e.getModifierState('CapsLock'))
  }

  return (
    <div className={cx('flex flex-col gap-2 short:gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="text-sm font-semibold">{label}</label>
        {labelAction && <span className="text-sm">{labelAction}</span>}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx('sh-input h-12 short:h-10', isPassword && 'pr-12')}
          {...(isEmail ? { inputMode: 'email' as const, autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } : {})}
          onKeyUp={(e) => { trackCaps(e); onKeyUp?.(e) }}
          onKeyDown={(e) => { trackCaps(e); onKeyDown?.(e) }}
          onBlur={(e) => { setCapsLock(false); onBlur?.(e) }}
          {...rest}
        />
        {isPassword && (
          <button type="button" onClick={() => setRevealed((r) => !r)} aria-pressed={revealed}
            aria-label={toggleLabel} title={toggleLabel}
            className="absolute inset-y-0 right-1.5 my-auto grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:text-fg">
            <EyeIcon crossed={revealed} />
          </button>
        )}
      </div>
      {showCaps && <p id={`${inputId}-caps`} className="text-xs text-warn">Verrouillage des majuscules activé.</p>}
      {hint && !error && <div id={`${inputId}-hint`} className="text-xs text-muted">{hint}</div>}
      {error && <p id={`${inputId}-error`} className="text-xs text-danger">{error}</p>}
    </div>
  )
})

/** Eye when the password is hidden, crossed-out eye once it is shown. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" />}
    </svg>
  )
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

/** Green-ticked checkbox with its label (native input, so keyboard and screen readers work as usual). */
export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <label htmlFor={inputId} className={cx('inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-muted', className)}>
      <input id={inputId} type="checkbox" className="peer sr-only" {...rest} />
      <span aria-hidden="true"
        className="grid h-5 w-5 place-items-center rounded border border-line/40 bg-raised text-transparent transition
          peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg
          peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
      </span>
      <span className="peer-checked:text-fg">{label}</span>
    </label>
  )
}

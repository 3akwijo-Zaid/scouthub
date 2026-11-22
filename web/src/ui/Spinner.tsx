import { cx } from './cx'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx('animate-spin', className ?? 'h-5 w-5')} role={label ? 'img' : undefined}
      aria-label={label} aria-hidden={label ? undefined : true}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Full-area loading state. */
export function PageSpinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center text-muted">
      <div className="flex items-center gap-3">
        <Spinner />
        <span>{label}</span>
      </div>
    </div>
  )
}

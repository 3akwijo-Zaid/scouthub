/** ScoutHub mark: a highlighted player "star" in its constellation (echoes the Player Galaxy). */
export function Logo({ withName = true, size = 'md' }: { withName?: boolean; size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <span className={lg ? 'inline-flex items-center gap-3' : 'inline-flex items-center gap-2.5'}>
      <svg viewBox="0 0 32 32" className={lg ? 'h-10 w-10' : 'h-8 w-8'} aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="rgb(var(--sh-raised))" />
        <line x1="16" y1="16" x2="25" y2="8" stroke="rgb(var(--sh-accent))" strokeWidth="1.2" />
        <line x1="16" y1="16" x2="7" y2="23" stroke="rgb(var(--sh-info))" strokeWidth="1.2" />
        <circle cx="16" cy="16" r="7.5" fill="none" stroke="rgb(var(--sh-accent))" strokeWidth="1.6" />
        <circle cx="16" cy="16" r="3" fill="rgb(var(--sh-fg))" />
        <circle cx="25" cy="8" r="1.8" fill="rgb(var(--sh-accent))" />
        <circle cx="7" cy="23" r="1.5" fill="rgb(var(--sh-info))" />
      </svg>
      {withName && (
        <span className={lg ? 'font-display text-2xl font-bold tracking-wide' : 'font-display text-xl font-bold tracking-wide'}>
          ScoutHub
        </span>
      )}
    </span>
  )
}

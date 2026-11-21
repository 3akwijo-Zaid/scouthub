import type { Grade } from './types'

/** Quality grades shown as collectible-card tiers. */
export const TIERS: Record<Grade, { color: string; name: string }> = {
  A: { color: 'var(--gold)', name: 'Or' },
  B: { color: 'var(--silver)', name: 'Argent' },
  C: { color: 'var(--bronze)', name: 'Bronze' },
  D: { color: 'var(--red)', name: 'Carton rouge' },
}

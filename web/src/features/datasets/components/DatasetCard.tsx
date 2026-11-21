import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { formatNumber } from '../chartData'
import { useTilt } from '../hooks/useTilt'
import { TIERS } from '../tiers'
import type { DatasetSummary } from '../types'

/** A dataset shown as a collectible card: tilts and catches the light under the cursor or the finger. */
export function DatasetCard({ dataset }: { dataset: DatasetSummary }) {
  const { ref, handlers } = useTilt<HTMLAnchorElement>()
  const tier = TIERS[dataset.qualityGrade]
  const imported = new Date(dataset.importedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Link
      ref={ref}
      to={`/datasets/${dataset.id}`}
      className="sh-card h-full"
      style={{ '--tier': tier.color } as CSSProperties}
      aria-label={`${dataset.title}, qualité ${tier.name}, ${dataset.qualityScore.toFixed(1)} sur 100`}
      {...handlers}
    >
      <article className="sh-card-face flex h-full flex-col p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="sh-card-rating font-display leading-none">
            <span className="block text-6xl font-extrabold">{Math.round(dataset.qualityScore)}</span>
            <span className="text-sm font-semibold">{tier.name}</span>
          </div>
          <span className="font-display text-4xl font-bold" style={{ color: tier.color }}>{dataset.qualityGrade}</span>
        </div>

        <h2 className="font-display text-2xl font-bold leading-tight text-[var(--chalk)]">{dataset.title}</h2>
        {dataset.description && (
          <p className="mt-2 line-clamp-2 text-sm text-[var(--chalk-dim)]">{dataset.description}</p>
        )}

        <div className="min-h-5 flex-1" aria-hidden />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--line)] pt-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--chalk-dim)]">Lignes</dt>
            <dd className="font-display text-xl font-semibold">{formatNumber(dataset.rowCount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--chalk-dim)]">Colonnes</dt>
            <dd className="font-display text-xl font-semibold">{dataset.columnCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--chalk-dim)]">Catégorie</dt>
            <dd>{dataset.category ?? 'Aucune'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--chalk-dim)]">Importé le</dt>
            <dd>{imported}</dd>
          </div>
        </dl>
      </article>
    </Link>
  )
}

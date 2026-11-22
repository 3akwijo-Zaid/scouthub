import type { CSSProperties } from 'react'
import { TIERS } from '../tiers'
import type { Grade } from '../types'

interface Props {
  score: number
  grade: Grade
}

/** Grade chip in the tier colour (A gold, B silver, C bronze, D red card). */
export function QualityBadge({ score, grade }: Props) {
  const tier = TIERS[grade]
  return (
    <span
      className="font-display inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold"
      style={{ borderColor: tier.color, color: tier.color } as CSSProperties}
      title={`Qualité ${tier.name.toLowerCase()} : ${score.toFixed(1)} sur 100`}
    >
      {grade}
      <span className="font-medium opacity-80">{score.toFixed(1)}</span>
    </span>
  )
}

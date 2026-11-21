import type { Grade } from '../types'

const GRADE_STYLES: Record<Grade, string> = {
  A: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  B: 'bg-sky-100 text-sky-800 ring-sky-300',
  C: 'bg-amber-100 text-amber-800 ring-amber-300',
  D: 'bg-rose-100 text-rose-800 ring-rose-300',
}

interface Props {
  score: number
  grade: Grade
  size?: 'sm' | 'lg'
}

/** Quality score with its grade (A ≥ 90, B ≥ 75, C ≥ 60, D below). */
export function QualityBadge({ score, grade, size = 'sm' }: Props) {
  const sizing = size === 'lg' ? 'px-3 py-1.5 text-base' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${GRADE_STYLES[grade]} ${sizing}`}
      title="Score de qualité des données"
    >
      <span>{grade}</span>
      <span className="font-normal opacity-80">{score.toFixed(1)} / 100</span>
    </span>
  )
}

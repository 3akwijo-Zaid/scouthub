// Pure functions turning dataset rows into chart series (no React, easy to test)
import type { CellValue, Row } from './types'

export interface Bin {
  label: string
  from: number
  to: number
  count: number
}

export interface CategoryValue {
  name: string
  value: number
}

export interface Point {
  x: number
  y: number
}

export interface TimePoint {
  date: string
  value: number
}

export function toNumber(value: CellValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Splits numeric values into `binCount` equal-width bins. */
export function histogram(rows: Row[], column: string, binCount = 12): Bin[] {
  const values = rows.map((r) => toNumber(r[column])).filter((v): v is number => v !== null)
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    return [{ label: formatNumber(min), from: min, to: max, count: values.length }]
  }
  const width = (max - min) / binCount
  const bins: Bin[] = Array.from({ length: binCount }, (_, i) => {
    const from = min + i * width
    const to = i === binCount - 1 ? max : from + width
    return { label: `${formatNumber(from)} – ${formatNumber(to)}`, from, to, count: 0 }
  })
  for (const v of values) {
    const index = Math.min(Math.floor((v - min) / width), binCount - 1)
    bins[index].count++
  }
  return bins
}

/** Number of rows per category, most frequent first. */
export function countByCategory(rows: Row[], column: string, limit = 10): CategoryValue[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = row[column]
    if (key === null || key === undefined || key === '') continue
    const name = typeof key === 'boolean' ? (key ? 'oui' : 'non') : String(key)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/** Mean of `measure` per category, highest first. */
export function meanByCategory(rows: Row[], category: string, measure: string, limit = 12): CategoryValue[] {
  const sums = new Map<string, { sum: number; n: number }>()
  for (const row of rows) {
    const key = row[category]
    const value = toNumber(row[measure])
    if (key === null || key === undefined || key === '' || value === null) continue
    const name = String(key)
    const entry = sums.get(name) ?? { sum: 0, n: 0 }
    entry.sum += value
    entry.n++
    sums.set(name, entry)
  }
  return [...sums.entries()]
    .map(([name, { sum, n }]) => ({ name, value: round(sum / n) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/** Pairs of numbers for a scatter plot (rows where both values exist). */
export function points(rows: Row[], xColumn: string, yColumn: string): Point[] {
  const out: Point[] = []
  for (const row of rows) {
    const x = toNumber(row[xColumn])
    const y = toNumber(row[yColumn])
    if (x !== null && y !== null) out.push({ x, y })
  }
  return out
}

/** Mean of `measure` per date (ISO strings sort chronologically). */
export function timeSeries(rows: Row[], dateColumn: string, measure: string): TimePoint[] {
  const byDate = new Map<string, { sum: number; n: number }>()
  for (const row of rows) {
    const date = row[dateColumn]
    const value = toNumber(row[measure])
    if (typeof date !== 'string' || value === null) continue
    const entry = byDate.get(date) ?? { sum: 0, n: 0 }
    entry.sum += value
    entry.n++
    byDate.set(date, entry)
  }
  return [...byDate.entries()]
    .map(([date, { sum, n }]) => ({ date, value: round(sum / n) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return numberFormat.format(value)
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`
}

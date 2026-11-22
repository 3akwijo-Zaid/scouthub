import { useEffect, useState } from 'react'
import { errorMessage, getRows } from '../api'
import { formatNumber } from '../chartData'
import { ripple } from '../hooks/ripple'
import type { CellValue, ColumnInfo, RowsPage, RowsQuery } from '../types'

interface Props {
  datasetId: number
  columns: ColumnInfo[]
}

const PAGE_SIZE = 50

/** Paginated table of dataset rows with search, column filter and sort (CdC §5.4). */
export function RowsTable({ datasetId, columns }: Props) {
  const [query, setQuery] = useState<RowsQuery>({ page: 0, size: PAGE_SIZE })
  const [searchInput, setSearchInput] = useState('')
  const [filterColumn, setFilterColumn] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [data, setData] = useState<RowsPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hotColumn, setHotColumn] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRows(datasetId, query)
      .then((page) => {
        if (!cancelled) {
          setData(page)
          setError(null)
        }
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [datasetId, query])

  function applySearch() {
    setQuery((q) => ({
      ...q,
      page: 0,
      q: searchInput || undefined,
      filterColumn: filterColumn || undefined,
      filterValue: filterColumn ? filterValue || undefined : undefined,
    }))
  }

  function toggleSort(column: string) {
    setQuery((q) => ({
      ...q,
      page: 0,
      sort: column,
      dir: q.sort === column && q.dir !== 'desc' ? 'desc' : 'asc',
    }))
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.totalItems / PAGE_SIZE)) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Rechercher dans toutes les cellules" aria-label="Rechercher dans toutes les cellules"
          className="sh-field flex-1" />
        <select value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)} aria-label="Colonne à filtrer"
          className="sh-field sm:w-52">
          <option value="">Filtrer une colonne</option>
          {columns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {filterColumn && (
          <input value={filterValue} onChange={(e) => setFilterValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="contient" aria-label="Valeur du filtre" className="sh-field sm:w-40" />
        )}
        <button onPointerDown={ripple} onClick={applySearch} className="sh-btn sh-ripple justify-center">Appliquer</button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-[var(--red)] bg-[rgba(229,72,77,0.12)] px-4 py-3 text-sm">{error}</p>}

      <div className="sh-panel max-h-[65vh] overflow-auto" onPointerLeave={() => setHotColumn(null)}>
        <table className="sh-table text-sm">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.name} data-col-hot={hotColumn === c.name} onPointerEnter={() => setHotColumn(c.name)}
                  aria-sort={query.sort === c.name ? (query.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
                  <button onClick={() => toggleSort(c.name)} className="inline-flex items-center gap-1 transition hover:text-[var(--flood)]">
                    {c.name}
                    <span className={query.sort === c.name ? 'text-[var(--flood)]' : 'opacity-0'} aria-hidden>
                      {query.dir === 'desc' ? '▼' : '▲'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
            {data?.content.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.name} data-col-hot={hotColumn === c.name} onPointerEnter={() => setHotColumn(c.name)}
                    className="whitespace-nowrap">
                    {display(row[c.name], isIdentifier(c.name))}
                  </td>
                ))}
              </tr>
            ))}
            {data && data.content.length === 0 && (
              <tr><td colSpan={columns.length} className="py-10 text-center text-[var(--chalk-dim)]">Aucune ligne ne correspond à ces critères.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--chalk-dim)]">
        <span>{data ? `${formatNumber(data.totalItems)} ligne(s)` : 'Chargement…'}</span>
        <div className="flex items-center gap-2">
          <button disabled={query.page === 0} onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
            className="sh-btn-ghost disabled:opacity-30">Précédent</button>
          <span className="tabular-nums text-[var(--chalk)]">Page {query.page + 1} / {totalPages}</span>
          <button disabled={query.page + 1 >= totalPages} onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
            className="sh-btn-ghost disabled:opacity-30">Suivant</button>
        </div>
      </div>
    </div>
  )
}

/** Identifier columns (id, player_id…) are shown as is, without thousands separators. */
function isIdentifier(name: string): boolean {
  const n = name.toLowerCase()
  return n === 'id' || n.endsWith('_id') || n.endsWith(' id')
}

function display(value: CellValue | undefined, identifier = false): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return identifier ? String(value) : formatNumber(value)
  if (typeof value === 'boolean') return value ? 'oui' : 'non'
  return value
}

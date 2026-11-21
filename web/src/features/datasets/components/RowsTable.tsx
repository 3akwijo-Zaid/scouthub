import { useEffect, useState } from 'react'
import { errorMessage, getRows } from '../api'
import { formatNumber } from '../chartData'
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Rechercher dans toutes les cellules…"
          className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <select value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm">
          <option value="">Filtrer une colonne…</option>
          {columns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {filterColumn && (
          <input value={filterValue} onChange={(e) => setFilterValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="contient…" className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        )}
        <button onClick={applySearch} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
          Appliquer
        </button>
      </div>

      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {columns.map((c) => (
                <th key={c.name} className="whitespace-nowrap px-3 py-2 font-medium">
                  <button onClick={() => toggleSort(c.name)} className="inline-flex items-center gap-1 hover:text-slate-900">
                    {c.name}
                    {query.sort === c.name && <span>{query.dir === 'desc' ? '▼' : '▲'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data?.content.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                {columns.map((c) => (
                  <td key={c.name} className="whitespace-nowrap px-3 py-1.5 text-slate-800">{display(row[c.name], isIdentifier(c.name))}</td>
                ))}
              </tr>
            ))}
            {data && data.content.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">Aucune ligne ne correspond.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{data ? `${formatNumber(data.totalItems)} ligne(s)` : '…'}</span>
        <div className="flex items-center gap-2">
          <button disabled={query.page === 0} onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
            className="rounded-md border px-3 py-1 disabled:opacity-40">Précédent</button>
          <span>Page {query.page + 1} / {totalPages}</span>
          <button disabled={query.page + 1 >= totalPages} onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
            className="rounded-md border px-3 py-1 disabled:opacity-40">Suivant</button>
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

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage, listDatasets } from './api'
import { formatNumber } from './chartData'
import { ImportDatasetDialog } from './components/ImportDatasetDialog'
import { QualityBadge } from './components/QualityBadge'
import type { DatasetSummary } from './types'

/** List of imported datasets with search, category filter and the import button. */
export function DatasetsPage() {
  const navigate = useNavigate()
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const load = useCallback(async (q: string, cat: string) => {
    setLoading(true)
    try {
      setDatasets(await listDatasets(q, cat))
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void load(search, category), 250)
    return () => clearTimeout(timer)
  }, [search, category, load])

  const categories = [...new Set(datasets.map((d) => d.category).filter((c): c is string => !!c))].sort()

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Datasets</h1>
          <p className="text-sm text-slate-500">Importez un CSV : ScoutHub le profile, calcule son score de qualité et propose des graphiques.</p>
        </div>
        <button onClick={() => setImporting(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          + Importer un CSV
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un dataset…"
          className="min-w-64 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {!loading && datasets.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Aucun dataset pour l'instant. Importez votre premier fichier CSV.
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {datasets.map((d) => (
          <li key={d.id}>
            <Link to={`/datasets/${d.id}`}
              className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{d.title}</h2>
                <QualityBadge score={d.qualityScore} grade={d.qualityGrade} />
              </div>
              {d.description && <p className="mb-3 line-clamp-2 text-sm text-slate-600">{d.description}</p>}
              <dl className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                <dt>Lignes</dt><dd className="text-right text-slate-800">{formatNumber(d.rowCount)}</dd>
                <dt>Colonnes</dt><dd className="text-right text-slate-800">{d.columnCount}</dd>
                <dt>Catégorie</dt><dd className="text-right text-slate-800">{d.category ?? '—'}</dd>
                <dt>Importé le</dt><dd className="text-right text-slate-800">{new Date(d.importedAt).toLocaleDateString('fr-FR')}</dd>
              </dl>
            </Link>
          </li>
        ))}
      </ul>

      {importing && (
        <ImportDatasetDialog
          onClose={() => setImporting(false)}
          onImported={(created) => {
            setImporting(false)
            navigate(`/datasets/${created.id}`)
          }}
        />
      )}
    </div>
  )
}

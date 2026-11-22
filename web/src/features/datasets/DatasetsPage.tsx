import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/features/auth/session'
import { errorMessage, listDatasets } from './api'
import { DatasetCard } from './components/DatasetCard'
import { ImportDatasetDialog } from './components/ImportDatasetDialog'
import { ripple } from './hooks/ripple'
import { canImportDatasets } from './permissions'
import type { DatasetSummary } from './types'
import './datasets.css'

/** Imported datasets as a collection of cards, with search, category filter and import. */
export function DatasetsPage() {
  const navigate = useNavigate()
  const canImport = canImportDatasets(useSession((s) => s.user))
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
  const isEmpty = !loading && datasets.length === 0 && !error && !search && !category

  return (
    <div className="sh-datasets">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8">
        <header className="sh-pitch-head mb-8 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="font-display text-5xl font-extrabold leading-none sm:text-6xl">Datasets</h1>
            <p className="mt-3 text-[var(--chalk-dim)]">
              Chaque fichier importé reçoit une note de qualité, des statistiques par colonne et des graphiques choisis pour lui.
            </p>
          </div>
          {canImport && (
            <button onPointerDown={ripple} onClick={() => setImporting(true)} className="sh-btn sh-ripple">
              Importer un CSV
            </button>
          )}
        </header>

        {!isEmpty && (
          <div className="mb-8 flex flex-col gap-3 sm:flex-row">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un dataset"
              aria-label="Rechercher un dataset" className="sh-field flex-1" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie"
              className="sh-field sm:w-56">
              <option value="">Toutes les catégories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {error && <p role="alert" className="mb-6 rounded-xl border border-[var(--red)] bg-[rgba(229,72,77,0.12)] px-4 py-3">{error}</p>}

        {isEmpty && canImport ? (
          <button onPointerDown={ripple} onClick={() => setImporting(true)}
            className="sh-drop sh-ripple w-full py-16 text-[var(--chalk-dim)] transition hover:text-[var(--chalk)]">
            <span className="font-display block text-3xl font-bold text-[var(--chalk)]">Aucun dataset pour l'instant</span>
            <span className="mt-2 block">Importez un premier fichier CSV pour le voir analysé ici.</span>
          </button>
        ) : isEmpty ? (
          <div className="sh-drop w-full py-16 text-center text-[var(--chalk-dim)]">
            <span className="font-display block text-3xl font-bold text-[var(--chalk)]">Aucun dataset pour l'instant</span>
            <span className="mt-2 block">Les fichiers importés par les analystes apparaîtront ici.</span>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading && datasets.length === 0
              ? [0, 1, 2].map((i) => <li key={i} className="sh-skeleton h-72" />)
              : datasets.map((d) => (
                <li key={d.id}><DatasetCard dataset={d} /></li>
              ))}
          </ul>
        )}

        {!loading && datasets.length === 0 && !isEmpty && (
          <p className="mt-10 text-center text-[var(--chalk-dim)]">Aucun dataset ne correspond à cette recherche.</p>
        )}
      </div>

      {importing && canImport && (
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

import { useState, type FormEvent } from 'react'
import { errorMessage, importDataset } from '../api'
import type { DatasetSummary } from '../types'

interface Props {
  onClose: () => void
  onImported: (dataset: DatasetSummary) => void
}

const MAX_SIZE_MB = 20

/** Form to upload a CSV with its title, description, category and source (CdC §5.3). */
export function ImportDatasetDialog({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  function pickFile(selected: File | null) {
    setError(null)
    if (selected && selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Le fichier dépasse ${MAX_SIZE_MB} Mo.`)
      setFile(null)
      return
    }
    setFile(selected)
    if (selected && !title) {
      setTitle(selected.name.replace(/\.(csv|txt)$/i, ''))
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setError('Choisissez un fichier CSV.')
      return
    }
    if (!title.trim()) {
      setError('Le titre est obligatoire.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const created = await importDataset({ file, title: title.trim(), description, category, source })
      onImported(created)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Importer un dataset</h2>
          <p className="text-sm text-slate-500">Fichier CSV (séparateur , ; tabulation ou |), {MAX_SIZE_MB} Mo maximum.</p>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Fichier CSV *</span>
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-white"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Titre *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Catégorie</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={80}
              placeholder="Joueurs, Clubs…" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Source</span>
            <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={300}
              placeholder="Kaggle, FBref…" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>

        {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Annuler
          </button>
          <button type="submit" disabled={sending}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {sending ? 'Analyse en cours…' : 'Importer et analyser'}
          </button>
        </div>
      </form>
    </div>
  )
}

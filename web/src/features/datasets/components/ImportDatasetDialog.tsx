import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { errorMessage, importDataset } from '../api'
import { ripple } from '../hooks/ripple'
import type { DatasetSummary } from '../types'

interface Props {
  onClose: () => void
  onImported: (dataset: DatasetSummary) => void
}

const MAX_SIZE_MB = 20

/** Import form: drop or pick a CSV, then title, description, category and source (CdC §5.3). */
export function ImportDatasetDialog({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sending && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, sending])

  function pickFile(selected: File | null) {
    setError(null)
    if (!selected) return
    if (!/\.(csv|txt)$/i.test(selected.name)) {
      setError('Choisissez un fichier .csv.')
      return
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Le fichier dépasse ${MAX_SIZE_MB} Mo.`)
      return
    }
    setFile(selected)
    if (!title) setTitle(selected.name.replace(/\.(csv|txt)$/i, '').replace(/[_-]+/g, ' '))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    pickFile(e.dataTransfer.files?.[0] ?? null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setError('Choisissez un fichier CSV.')
      return
    }
    if (!title.trim()) {
      setError('Donnez un titre au dataset.')
      return
    }
    setSending(true)
    setError(null)
    try {
      onImported(await importDataset({ file, title: title.trim(), description, category, source }))
    } catch (e) {
      setError(errorMessage(e))
      setSending(false)
    }
  }

  return (
    <div className="sh-datasets !min-h-0 !bg-transparent">
      <div className="sh-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[rgba(4,14,10,0.72)] sm:items-center sm:p-6"
        role="dialog" aria-modal="true" aria-labelledby="import-title"
        onClick={(e) => e.target === e.currentTarget && !sending && onClose()}>
        <form onSubmit={submit}
          className="sh-sheet sh-panel w-full max-w-lg space-y-4 rounded-b-none p-6 sm:rounded-b-[18px] !bg-[var(--turf)]">
          <div className="mx-auto -mt-2 mb-1 h-1.5 w-12 rounded-full bg-[var(--line)] sm:hidden" aria-hidden />
          <h2 id="import-title" className="font-display text-3xl font-bold">Importer un dataset</h2>

          <div
            className="sh-drop cursor-pointer"
            data-over={over}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,.txt,text/csv" className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <>
                <span className="font-display block text-xl font-semibold text-[var(--flood)]">{file.name}</span>
                <span className="text-sm text-[var(--chalk-dim)]">{(file.size / 1024).toFixed(0)} Ko. Touchez pour changer de fichier.</span>
              </>
            ) : (
              <>
                <span className="font-display block text-xl font-semibold">Déposez un fichier CSV ici</span>
                <span className="text-sm text-[var(--chalk-dim)]">ou touchez pour le choisir. Séparateur , ; tabulation ou |, {MAX_SIZE_MB} Mo au plus.</span>
              </>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-[var(--chalk-dim)]">Titre</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="sh-field" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-[var(--chalk-dim)]">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="sh-field" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--chalk-dim)]">Catégorie</span>
              <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={80}
                placeholder="Joueurs, clubs…" className="sh-field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--chalk-dim)]">Source</span>
              <input value={source} onChange={(e) => setSource(e.target.value)} maxLength={300}
                placeholder="Kaggle, FBref…" className="sh-field" />
            </label>
          </div>

          {error && <p role="alert" className="rounded-xl border border-[var(--red)] bg-[rgba(229,72,77,0.12)] px-3 py-2 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={sending} className="sh-btn-ghost">Annuler</button>
            <button type="submit" onPointerDown={ripple} disabled={sending} className="sh-btn sh-ripple">
              {sending ? 'Analyse en cours…' : 'Importer et analyser'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

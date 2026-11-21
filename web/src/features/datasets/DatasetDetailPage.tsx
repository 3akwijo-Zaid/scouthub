import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDataset, errorMessage, getDataset, getSampleRows } from './api'
import { formatNumber, formatPercent } from './chartData'
import { QualityBadge } from './components/QualityBadge'
import { RecommendedChart } from './components/RecommendedChart'
import { RowsTable } from './components/RowsTable'
import type { ColumnInfo, ColumnType, DatasetDetail, QualityReport, Row } from './types'

type Tab = 'overview' | 'columns' | 'data'

const TYPE_LABELS: Record<ColumnType, string> = {
  INTEGER: 'Entier',
  DECIMAL: 'Nombre',
  BOOLEAN: 'Booléen',
  DATE: 'Date',
  CATEGORY: 'Catégorie',
  TEXT: 'Texte',
}

const SAMPLE_SIZE = 1000

/** One dataset: quality report, recommended charts, column statistics and the rows table. */
export function DatasetDetailPage() {
  const { id } = useParams()
  const datasetId = Number(id)
  const navigate = useNavigate()
  const [detail, setDetail] = useState<DatasetDetail | null>(null)
  const [sample, setSample] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    if (!Number.isFinite(datasetId)) return
    let cancelled = false
    Promise.all([getDataset(datasetId), getSampleRows(datasetId, SAMPLE_SIZE)])
      .then(([d, rows]) => {
        if (!cancelled) {
          setDetail(d)
          setSample(rows)
        }
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [datasetId])

  async function remove() {
    if (!detail || !window.confirm(`Supprimer le dataset « ${detail.dataset.title} » ?`)) return
    try {
      await deleteDataset(datasetId)
      navigate('/datasets')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        <Link to="/datasets" className="mt-4 inline-block text-sm text-emerald-700">← Retour aux datasets</Link>
      </div>
    )
  }
  if (!detail) {
    return <p className="p-6 text-slate-500">Chargement…</p>
  }

  const { dataset, quality } = detail

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link to="/datasets" className="text-sm text-emerald-700">← Datasets</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dataset.title}</h1>
          {dataset.description && <p className="mt-1 max-w-3xl text-slate-600">{dataset.description}</p>}
          <p className="mt-2 text-xs text-slate-500">
            {dataset.fileName} · {dataset.category ?? 'Sans catégorie'} · source : {dataset.source ?? '—'} ·
            importé le {new Date(dataset.importedAt).toLocaleString('fr-FR')} par {dataset.ownerEmail ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <QualityBadge score={dataset.qualityScore} grade={dataset.qualityGrade} size="lg" />
          <button onClick={remove} className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">
            Supprimer
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Lignes" value={formatNumber(dataset.rowCount)} />
        <Kpi label="Colonnes" value={String(dataset.columnCount)} />
        <Kpi label="Lignes en double" value={formatNumber(detail.duplicateRows)} />
        <Kpi label="Complétude" value={formatPercent(quality.completeness)} />
      </section>

      <nav className="flex gap-1 border-b border-slate-200">
        {([['overview', 'Qualité & graphiques'], ['columns', 'Colonnes'], ['data', 'Données']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === key ? 'border-emerald-600 font-medium text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="space-y-6">
          <QualityPanel quality={quality} />
          <section>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Visualisations recommandées</h2>
            <p className="mb-3 text-xs text-slate-500">
              Choisies automatiquement d'après le type des colonnes.
              {dataset.rowCount > sample.length && ` Graphiques calculés sur un échantillon de ${formatNumber(sample.length)} lignes.`}
            </p>
            {detail.recommendations.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune visualisation pertinente pour ce dataset.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {detail.recommendations.map((r) => (
                  <RecommendedChart key={`${r.chart}-${r.columns.join('-')}`} recommendation={r} rows={sample} columns={detail.columns} />
                ))}
              </div>
            )}
          </section>
          {detail.correlations.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Corrélations les plus fortes</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {detail.correlations.slice(0, 6).map((c) => (
                  <li key={`${c.columnA}-${c.columnB}`} className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>{c.columnA} ↔ {c.columnB}</span>
                    <span className={c.coefficient >= 0 ? 'text-emerald-700' : 'text-rose-700'}>r = {c.coefficient.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === 'columns' && <ColumnsTable columns={detail.columns} rowCount={dataset.rowCount} />}
      {tab === 'data' && <RowsTable datasetId={datasetId} columns={detail.columns} />}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function QualityPanel({ quality }: { quality: QualityReport }) {
  const parts: [string, number, string][] = [
    ['Complétude', quality.completeness, 'cellules renseignées'],
    ['Unicité', quality.uniqueness, 'lignes non dupliquées'],
    ['Validité', quality.validity, 'valeurs conformes au type'],
    ['Cohérence', quality.consistency, 'lignes au bon format'],
  ]
  return (
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Score de qualité : {quality.score.toFixed(1)} / 100</h2>
        {parts.map(([label, ratio, hint]) => (
          <div key={label}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700">{label} <span className="text-xs text-slate-400">({hint})</span></span>
              <span className="font-medium">{formatPercent(ratio)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.round(ratio * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-2 font-medium text-slate-900">Points d'attention</h3>
        {quality.issues.length === 0 ? (
          <p className="text-sm text-emerald-700">Aucun problème détecté.</p>
        ) : (
          <ul className="space-y-1.5 text-sm text-slate-700">
            {quality.issues.map((issue) => (
              <li key={issue} className="rounded-md bg-amber-50 px-3 py-1.5">{issue}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ColumnsTable({ columns, rowCount }: { columns: ColumnInfo[]; rowCount: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            {['Colonne', 'Type', 'Manquantes', 'Distinctes', 'Invalides', 'Min', 'Moyenne', 'Médiane', 'Max', 'Écart-type', 'Aberrantes', 'Valeurs fréquentes'].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map(({ name, profile: p }) => (
            <tr key={name} className="border-t border-slate-100">
              <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                {name}{p.geoRole && <span className="ml-1 text-xs text-sky-600">({p.geoRole === 'LATITUDE' ? 'lat' : 'lon'})</span>}
              </td>
              <td className="px-3 py-2">{TYPE_LABELS[p.type]}</td>
              <td className="px-3 py-2">{formatNumber(p.missing)} <span className="text-xs text-slate-400">({formatPercent(rowCount ? p.missing / rowCount : 0)})</span></td>
              <td className="px-3 py-2">{formatNumber(p.distinct)}</td>
              <td className={`px-3 py-2 ${p.invalid > 0 ? 'text-rose-700' : ''}`}>{formatNumber(p.invalid)}</td>
              <td className="px-3 py-2">{p.type === 'DATE' ? p.minDate ?? '—' : formatNumber(p.min)}</td>
              <td className="px-3 py-2">{formatNumber(p.mean)}</td>
              <td className="px-3 py-2">{formatNumber(p.median)}</td>
              <td className="px-3 py-2">{p.type === 'DATE' ? p.maxDate ?? '—' : formatNumber(p.max)}</td>
              <td className="px-3 py-2">{formatNumber(p.stdDev)}</td>
              <td className="px-3 py-2">{p.outliers ?? '—'}</td>
              <td className="max-w-64 truncate px-3 py-2 text-xs text-slate-600">
                {p.topValues?.slice(0, 3).map((v) => `${v.value} (${v.count})`).join(', ') ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

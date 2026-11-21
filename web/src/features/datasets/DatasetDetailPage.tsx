import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDataset, errorMessage, getDataset, getSampleRows } from './api'
import { formatNumber, formatPercent } from './chartData'
import { RecommendedChart } from './components/RecommendedChart'
import { RowsTable } from './components/RowsTable'
import { useCountUp } from './hooks/useCountUp'
import { useSwipe } from './hooks/useSwipe'
import { TIERS } from './tiers'
import type { ColumnInfo, ColumnType, DatasetDetail, QualityReport, Row } from './types'
import './datasets.css'

const TABS = [
  { key: 'overview', label: 'Qualité et graphiques' },
  { key: 'columns', label: 'Colonnes' },
  { key: 'data', label: 'Données' },
] as const
type Tab = (typeof TABS)[number]['key']

const TYPE_LABELS: Record<ColumnType, string> = {
  INTEGER: 'Entier',
  DECIMAL: 'Nombre',
  BOOLEAN: 'Oui / non',
  DATE: 'Date',
  CATEGORY: 'Catégorie',
  TEXT: 'Texte',
}

const SAMPLE_SIZE = 1000

/** One dataset: scoreboard with the quality score, recommended charts, column statistics and rows. */
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

  const tabIndex = TABS.findIndex((t) => t.key === tab)
  const swipe = useSwipe(
    () => setTab(TABS[Math.min(tabIndex + 1, TABS.length - 1)].key),
    () => setTab(TABS[Math.max(tabIndex - 1, 0)].key),
  )

  async function remove() {
    if (!detail || !window.confirm(`Supprimer le dataset « ${detail.dataset.title} » ? Cette action est définitive.`)) return
    try {
      await deleteDataset(datasetId)
      navigate('/datasets')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (error) {
    return (
      <div className="sh-datasets">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <p role="alert" className="rounded-xl border border-[var(--red)] bg-[rgba(229,72,77,0.12)] px-4 py-3">{error}</p>
          <Link to="/datasets" className="mt-6 inline-block text-[var(--flood)] hover:underline">Retour aux datasets</Link>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="sh-datasets">
        <div className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:px-8" aria-busy="true">
          <div className="sh-skeleton h-10 w-2/3" />
          <div className="sh-skeleton h-56" />
          <div className="sh-skeleton h-80" />
        </div>
      </div>
    )
  }

  const { dataset, quality } = detail
  const numericColumns = detail.columns.filter((c) => c.type === 'INTEGER' || c.type === 'DECIMAL').length

  return (
    <div className="sh-datasets">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8">
        <Link to="/datasets" className="text-sm text-[var(--chalk-dim)] transition hover:text-[var(--flood)]">← Tous les datasets</Link>

        <header className="sh-pitch-head mt-4 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-[0.95] sm:text-6xl">{dataset.title}</h1>
            {dataset.description && <p className="mt-4 max-w-2xl text-lg text-[var(--chalk-dim)]">{dataset.description}</p>}
            <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Meta label="Fichier" value={dataset.fileName} />
              <Meta label="Catégorie" value={dataset.category ?? 'Aucune'} />
              <Meta label="Source" value={dataset.source ?? 'Non précisée'} />
              <Meta label="Importé le" value={new Date(dataset.importedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} />
              <Meta label="Par" value={dataset.ownerEmail ?? 'Inconnu'} />
            </dl>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Lignes" value={formatNumber(dataset.rowCount)} />
              <Stat label="Colonnes" value={String(dataset.columnCount)} />
              <Stat label="Colonnes numériques" value={String(numericColumns)} />
              <Stat label="Lignes en double" value={formatNumber(detail.duplicateRows)} warn={detail.duplicateRows > 0} />
            </div>
          </div>
          <Scoreboard quality={quality} />
        </header>

        <div className="mt-10">
          <TabBar tab={tab} onChange={setTab} />
        </div>

        <div className="sh-swipe-area pt-6" {...swipe}>
          {tab === 'overview' && (
            <div className="space-y-8">
              <Issues issues={quality.issues} />
              <section>
                <h2 className="font-display text-3xl font-bold">Graphiques recommandés</h2>
                <p className="mb-4 mt-1 text-sm text-[var(--chalk-dim)]">
                  Choisis d'après le type de chaque colonne.
                  {dataset.rowCount > sample.length && ` Calculés sur les ${formatNumber(sample.length)} premières lignes.`}
                </p>
                {detail.recommendations.length === 0 ? (
                  <p className="text-[var(--chalk-dim)]">Aucun graphique pertinent pour ce dataset.</p>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {detail.recommendations.map((r) => (
                      <RecommendedChart key={`${r.chart}-${r.columns.join('-')}`} recommendation={r} rows={sample} columns={detail.columns} />
                    ))}
                  </div>
                )}
              </section>
              {detail.correlations.length > 0 && (
                <section>
                  <h2 className="font-display mb-4 text-3xl font-bold">Colonnes qui évoluent ensemble</h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {detail.correlations.slice(0, 6).map((c) => (
                      <li key={`${c.columnA}-${c.columnB}`} className="sh-panel flex items-center gap-4 px-4 py-3">
                        <CorrelationMeter r={c.coefficient} />
                        <span className="flex-1 text-sm">{c.columnA} et {c.columnB}</span>
                        <span className="font-display text-xl font-semibold tabular-nums">{c.coefficient.toFixed(2)}</span>
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

        <footer className="mt-16 border-t border-[var(--line)] pt-6">
          <button onClick={remove} className="text-sm text-[var(--chalk-dim)] transition hover:text-[var(--red)]">
            Supprimer ce dataset
          </button>
        </footer>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--chalk-dim)]">{label}</dt>
      <dd className="truncate" title={value}>{value}</dd>
    </div>
  )
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(13,42,34,0.6)] px-4 py-3">
      <p className="text-xs text-[var(--chalk-dim)]">{label}</p>
      <p className={`font-display text-3xl font-bold ${warn ? 'text-[var(--red)]' : ''}`}>{value}</p>
    </div>
  )
}

/** The page's one orchestrated moment: the score counts up like a stadium scoreboard. */
function Scoreboard({ quality }: { quality: QualityReport }) {
  const score = useCountUp(quality.score)
  const tier = TIERS[quality.grade]
  const parts: [string, number, string][] = [
    ['Complétude', quality.completeness, 'cellules renseignées'],
    ['Unicité', quality.uniqueness, 'lignes sans doublon'],
    ['Validité', quality.validity, 'valeurs du bon type'],
    ['Cohérence', quality.consistency, 'lignes au bon format'],
  ]
  return (
    <section className="sh-scoreboard p-6" aria-label={`Score de qualité ${quality.score.toFixed(1)} sur 100, catégorie ${tier.name}`}>
      <div className="flex items-end justify-between">
        <p className="text-sm text-[var(--chalk-dim)]">Score de qualité</p>
        <span className="font-display rounded-full border px-3 py-0.5 text-sm font-semibold"
          style={{ borderColor: tier.color, color: tier.color } as CSSProperties}>
          {tier.name} ({quality.grade})
        </span>
      </div>
      <p className="sh-led mt-1 text-8xl leading-none" aria-hidden>
        {score.toFixed(1)}<span className="text-3xl opacity-60">/100</span>
      </p>
      <div className="mt-6 space-y-3">
        {parts.map(([label, ratio, hint]) => (
          <div key={label} title={hint}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{label}</span>
              <span className="tabular-nums text-[var(--chalk-dim)]">{formatPercent(ratio)}</span>
            </div>
            <div className="sh-bar"><span style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Issues({ issues }: { issues: string[] }) {
  if (issues.length === 0) {
    return <p className="sh-panel px-5 py-4 text-[#7fd8a6]">Aucun problème détecté dans ce fichier.</p>
  }
  return (
    <section className="sh-panel px-5 py-4">
      <h2 className="font-display mb-3 text-2xl font-bold">À vérifier avant d'utiliser ces données</h2>
      <ul className="space-y-2">
        {issues.map((issue) => (
          <li key={issue} className="flex gap-3 text-sm">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-[var(--flood)]" aria-hidden />
            {issue}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Small horizontal gauge from −1 to 1 for a correlation coefficient. */
function CorrelationMeter({ r }: { r: number }) {
  const width = Math.abs(r) * 50
  return (
    <span className="relative h-2 w-16 shrink-0 rounded-full bg-[rgba(238,242,234,0.1)]" aria-hidden>
      <span className="absolute top-0 h-2 rounded-full"
        style={{ left: r >= 0 ? '50%' : `${50 - width}%`, width: `${width}%`, background: r >= 0 ? 'var(--flood)' : 'var(--sky)' }} />
      <span className="absolute left-1/2 top-[-2px] h-3 w-px bg-[var(--chalk-dim)]" />
    </span>
  )
}

/** Tabs with an indicator that slides to the selected tab; swipe left/right also changes tab. */
function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const update = () => {
      const el = refs.current[tab]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [tab])

  return (
    <div className="sh-tabs overflow-x-auto" role="tablist" aria-label="Sections du dataset">
      {TABS.map((t) => (
        <button key={t.key} ref={(el) => { refs.current[t.key] = el }} role="tab" aria-selected={tab === t.key}
          onClick={() => onChange(t.key)} className="sh-tab whitespace-nowrap">
          {t.label}
        </button>
      ))}
      <span className="sh-tab-indicator" style={{ left: indicator.left, width: indicator.width }} aria-hidden />
    </div>
  )
}

function ColumnsTable({ columns, rowCount }: { columns: ColumnInfo[]; rowCount: number }) {
  const headers = ['Colonne', 'Type', 'Manquantes', 'Distinctes', 'Invalides', 'Min', 'Moyenne', 'Médiane', 'Max', 'Écart-type', 'Aberrantes', 'Valeurs fréquentes']
  return (
    <div className="sh-panel max-h-[70vh] overflow-auto">
      <table className="sh-table text-sm">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {columns.map(({ name, profile: p }) => (
            <tr key={name}>
              <td className="font-medium">
                {name}
                {p.geoRole && <span className="ml-1 text-xs text-[var(--sky)]">{p.geoRole === 'LATITUDE' ? 'latitude' : 'longitude'}</span>}
              </td>
              <td className="text-[var(--chalk-dim)]">{TYPE_LABELS[p.type]}</td>
              <td>{formatNumber(p.missing)} <span className="text-xs text-[var(--chalk-dim)]">{formatPercent(rowCount ? p.missing / rowCount : 0)}</span></td>
              <td>{formatNumber(p.distinct)}</td>
              <td className={p.invalid > 0 ? 'text-[var(--red)]' : ''}>{formatNumber(p.invalid)}</td>
              <td>{p.type === 'DATE' ? p.minDate ?? '—' : formatNumber(p.min)}</td>
              <td>{formatNumber(p.mean)}</td>
              <td>{formatNumber(p.median)}</td>
              <td>{p.type === 'DATE' ? p.maxDate ?? '—' : formatNumber(p.max)}</td>
              <td>{formatNumber(p.stdDev)}</td>
              <td className={p.outliers ? 'text-[var(--flood)]' : ''}>{p.outliers ?? '—'}</td>
              <td className="max-w-64 truncate text-xs text-[var(--chalk-dim)]">
                {p.topValues?.slice(0, 3).map((v) => `${v.value} (${v.count})`).join(', ') ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

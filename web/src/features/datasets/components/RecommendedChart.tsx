import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { countByCategory, formatNumber, histogram, meanByCategory, points, timeSeries } from '../chartData'
import type { ColumnInfo, Row, VizRecommendation } from '../types'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#64748b']

interface Props {
  recommendation: VizRecommendation
  rows: Row[]
  columns: ColumnInfo[]
}

/** Draws one recommended chart from a sample of rows (and the column profiles for box plots). */
export function RecommendedChart({ recommendation, rows, columns }: Props) {
  const [first, second] = recommendation.columns
  const chart = renderChart(recommendation, rows, columns, first, second)

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="mb-3">
        <p className="font-medium text-slate-900">{recommendation.title}</p>
        <p className="text-xs text-slate-500">{recommendation.reason}</p>
      </figcaption>
      <div className="h-64">{chart ?? <Empty />}</div>
    </figure>
  )
}

function renderChart(rec: VizRecommendation, rows: Row[], columns: ColumnInfo[], first: string, second?: string) {
  switch (rec.chart) {
    case 'HISTOGRAM': {
      const data = histogram(rows, first)
      if (data.length === 0) return null
      return (
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="Nombre de lignes" fill={COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    case 'BAR': {
      const data = second ? meanByCategory(rows, first, second) : countByCategory(rows, first)
      if (data.length === 0) return null
      return (
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatNumber(v)} />
            <Bar dataKey="value" name={second ? `Moyenne de ${second}` : 'Nombre de lignes'} fill={COLORS[1]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    case 'PIE': {
      const data = countByCategory(rows, first, 6)
      if (data.length === 0) return null
      return (
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius="68%" label>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )
    }
    case 'LINE': {
      if (!second) return null
      const data = timeSeries(rows, first, second)
      if (data.length === 0) return null
      return (
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip formatter={(v: number) => formatNumber(v)} />
            <Line type="monotone" dataKey="value" name={second} stroke={COLORS[2]} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )
    }
    case 'SCATTER':
    case 'MAP': {
      if (!second) return null
      // MAP: columns are [latitude, longitude] → longitude on x, latitude on y (simplified map)
      const [xCol, yCol] = rec.chart === 'MAP' ? [second, first] : [first, second]
      const data = points(rows, xCol, yCol)
      if (data.length === 0) return null
      return (
        <ResponsiveContainer>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={xCol} domain={['auto', 'auto']} />
            <YAxis type="number" dataKey="y" name={yCol} domain={['auto', 'auto']} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill={rec.chart === 'MAP' ? COLORS[4] : COLORS[3]} />
          </ScatterChart>
        </ResponsiveContainer>
      )
    }
    case 'BOX': {
      const profile = columns.find((c) => c.name === first)?.profile
      if (!profile || profile.q1 === null || profile.q3 === null || profile.min === null || profile.max === null) return null
      return <BoxPlot min={profile.min} q1={profile.q1} median={profile.median ?? profile.q1} q3={profile.q3} max={profile.max} />
    }
    default:
      return null
  }
}

interface BoxProps {
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

/** Horizontal box plot drawn from the column statistics (whiskers at 1.5 × IQR). */
function BoxPlot({ min, q1, median, q3, max }: BoxProps) {
  const iqr = q3 - q1
  const low = Math.max(min, q1 - 1.5 * iqr)
  const high = Math.min(max, q3 + 1.5 * iqr)
  const span = max - min || 1
  const x = (v: number) => 20 + ((v - min) / span) * 360
  return (
    <svg viewBox="0 0 400 140" className="h-full w-full">
      <line x1={x(low)} x2={x(high)} y1={60} y2={60} stroke="#64748b" />
      <line x1={x(low)} x2={x(low)} y1={45} y2={75} stroke="#64748b" />
      <line x1={x(high)} x2={x(high)} y1={45} y2={75} stroke="#64748b" />
      <rect x={x(q1)} y={35} width={Math.max(x(q3) - x(q1), 1)} height={50} fill="#d1fae5" stroke="#10b981" />
      <line x1={x(median)} x2={x(median)} y1={35} y2={85} stroke="#047857" strokeWidth={2} />
      {min < low && <circle cx={x(min)} cy={60} r={3} fill="#ef4444" />}
      {max > high && <circle cx={x(max)} cy={60} r={3} fill="#ef4444" />}
      <text x={x(min)} y={115} fontSize={10} textAnchor="start" fill="#475569">{formatNumber(min)}</text>
      <text x={x(median)} y={115} fontSize={10} textAnchor="middle" fill="#047857">médiane {formatNumber(median)}</text>
      <text x={x(max)} y={115} fontSize={10} textAnchor="end" fill="#475569">{formatNumber(max)}</text>
    </svg>
  )
}

function Empty() {
  return <p className="flex h-full items-center justify-center text-sm text-slate-400">Pas assez de données pour ce graphique.</p>
}

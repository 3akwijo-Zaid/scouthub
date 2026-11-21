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

// Floodlight amber, sky, chalk, red card, mint, bronze, silver
const COLORS = ['#f4b740', '#7cc4e8', '#eef2ea', '#e5484d', '#7fd8a6', '#c98a55', '#c9d1c7']
const AXIS = { stroke: 'rgba(238,242,234,0.35)', tick: { fill: 'rgba(238,242,234,0.7)', fontSize: 11 } }
const GRID = { stroke: 'rgba(238,242,234,0.08)', strokeDasharray: '4 4' }
const TOOLTIP = {
  contentStyle: { background: '#07170f', border: '1px solid rgba(244,183,64,0.4)', borderRadius: 12, color: '#eef2ea' },
  itemStyle: { color: '#eef2ea' },
  labelStyle: { color: '#f4b740', fontWeight: 600 },
  cursor: { fill: 'rgba(244,183,64,0.08)', stroke: 'rgba(244,183,64,0.4)' },
}

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
    <figure className="sh-panel sh-chart-card p-5">
      <figcaption className="mb-4">
        <p className="font-display text-xl font-semibold">{recommendation.title}</p>
        <p className="text-sm text-[var(--chalk-dim)]">{recommendation.reason}</p>
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
            <CartesianGrid {...GRID} vertical={false} />
            <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} {...AXIS} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey="count" name="Lignes" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
    case 'BAR': {
      const data = second ? meanByCategory(rows, first, second) : countByCategory(rows, first)
      if (data.length === 0) return null
      return (
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
            <CartesianGrid {...GRID} horizontal={false} />
            <XAxis type="number" {...AXIS} />
            <YAxis type="category" dataKey="name" width={110} {...AXIS} />
            <Tooltip {...TOOLTIP} formatter={(v: number) => formatNumber(v)} />
            <Bar dataKey="value" name={second ? `Moyenne de ${second}` : 'Lignes'} fill={COLORS[1]} radius={[0, 6, 6, 0]} />
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
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="72%" paddingAngle={2}
              stroke="#13392e" strokeWidth={2} label={{ fill: '#eef2ea', fontSize: 12 }}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP} />
            <Legend wrapperStyle={{ color: '#eef2ea', fontSize: 12 }} />
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
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} />
            <YAxis {...AXIS} />
            <Tooltip {...TOOLTIP} formatter={(v: number) => formatNumber(v)} />
            <Line type="monotone" dataKey="value" name={second} stroke={COLORS[0]} strokeWidth={2.5} dot={false}
              activeDot={{ r: 6, fill: COLORS[0], stroke: '#07170f', strokeWidth: 2 }} />
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
          <ScatterChart margin={{ top: 12, right: 12 }}>
            <CartesianGrid {...GRID} />
            <XAxis type="number" dataKey="x" name={xCol} domain={['auto', 'auto']} {...AXIS} />
            <YAxis type="number" dataKey="y" name={yCol} domain={['auto', 'auto']} {...AXIS} />
            <Tooltip {...TOOLTIP} />
            <Scatter data={data} fill={rec.chart === 'MAP' ? COLORS[4] : COLORS[0]} fillOpacity={0.85} />
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
    <svg viewBox="0 0 400 140" className="h-full w-full" role="img" aria-label={`Médiane ${formatNumber(median)}, de ${formatNumber(min)} à ${formatNumber(max)}`}>
      <line x1={x(low)} x2={x(high)} y1={60} y2={60} stroke="rgba(238,242,234,0.5)" />
      <line x1={x(low)} x2={x(low)} y1={45} y2={75} stroke="rgba(238,242,234,0.5)" />
      <line x1={x(high)} x2={x(high)} y1={45} y2={75} stroke="rgba(238,242,234,0.5)" />
      <rect x={x(q1)} y={35} width={Math.max(x(q3) - x(q1), 1)} height={50} rx={6} fill="rgba(244,183,64,0.18)" stroke="#f4b740" />
      <line x1={x(median)} x2={x(median)} y1={35} y2={85} stroke="#f4b740" strokeWidth={3} />
      {min < low && <circle cx={x(min)} cy={60} r={4} fill="#e5484d" />}
      {max > high && <circle cx={x(max)} cy={60} r={4} fill="#e5484d" />}
      <text x={x(min)} y={115} fontSize={11} textAnchor="start" fill="rgba(238,242,234,0.7)">{formatNumber(min)}</text>
      <text x={x(median)} y={115} fontSize={11} textAnchor="middle" fill="#f4b740">médiane {formatNumber(median)}</text>
      <text x={x(max)} y={115} fontSize={11} textAnchor="end" fill="rgba(238,242,234,0.7)">{formatNumber(max)}</text>
    </svg>
  )
}

function Empty() {
  return <p className="flex h-full items-center justify-center text-sm text-[var(--chalk-dim)]">Pas assez de valeurs pour ce graphique.</p>
}

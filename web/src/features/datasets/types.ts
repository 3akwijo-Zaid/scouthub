// Types mirroring docs/api/openapi.yaml (Datasets section)

export type ColumnType = 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'CATEGORY' | 'TEXT'
export type ChartType = 'MAP' | 'LINE' | 'SCATTER' | 'BAR' | 'PIE' | 'HISTOGRAM' | 'BOX'
export type Grade = 'A' | 'B' | 'C' | 'D'

export interface DatasetSummary {
  id: number
  title: string
  description: string | null
  category: string | null
  source: string | null
  fileName: string
  ownerEmail: string | null
  importedAt: string
  rowCount: number
  columnCount: number
  qualityScore: number
  qualityGrade: Grade
}

export interface ValueCount {
  value: string
  count: number
}

export interface ColumnProfile {
  position: number
  name: string
  type: ColumnType
  count: number
  missing: number
  distinct: number
  invalid: number
  min: number | null
  max: number | null
  mean: number | null
  median: number | null
  stdDev: number | null
  q1: number | null
  q3: number | null
  outliers: number | null
  minDate: string | null
  maxDate: string | null
  topValues: ValueCount[] | null
  geoRole: 'LATITUDE' | 'LONGITUDE' | null
}

export interface ColumnInfo {
  position: number
  name: string
  type: ColumnType
  profile: ColumnProfile
}

export interface QualityReport {
  score: number
  grade: Grade
  completeness: number
  uniqueness: number
  validity: number
  consistency: number
  issues: string[]
}

export interface VizRecommendation {
  chart: ChartType
  title: string
  columns: string[]
  reason: string
  priority: number
}

export interface Correlation {
  columnA: string
  columnB: string
  coefficient: number
  pairs: number
}

export interface DatasetDetail {
  dataset: DatasetSummary
  duplicateRows: number
  columns: ColumnInfo[]
  quality: QualityReport
  recommendations: VizRecommendation[]
  correlations: Correlation[]
}

export type CellValue = string | number | boolean | null
export type Row = Record<string, CellValue>

export interface RowsPage {
  content: Row[]
  totalItems: number
  page: number
  pageSize: number
}

export interface RowsQuery {
  page: number
  size: number
  q?: string
  filterColumn?: string
  filterValue?: string
  sort?: string
  dir?: 'asc' | 'desc'
}

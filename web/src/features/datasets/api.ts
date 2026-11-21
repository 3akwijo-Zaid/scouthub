import axios, { AxiosError } from 'axios'
import type { DatasetDetail, DatasetSummary, Problem, RowsPage, RowsQuery } from './types'

/**
 * HTTP client for the datasets feature.
 * TODO(Zaid): replace with the shared API client once it exists (same baseURL + JWT interceptor).
 */
const http = axios.create({ baseURL: '/api' })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('scouthub.token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface ImportPayload {
  file: File
  title: string
  description?: string
  category?: string
  source?: string
}

export async function listDatasets(q?: string, category?: string): Promise<DatasetSummary[]> {
  const { data } = await http.get<DatasetSummary[]>('/datasets', {
    params: { q: q || undefined, category: category || undefined },
  })
  return data
}

export async function getDataset(id: number): Promise<DatasetDetail> {
  const { data } = await http.get<DatasetDetail>(`/datasets/${id}`)
  return data
}

export async function getRows(id: number, query: RowsQuery): Promise<RowsPage> {
  const { data } = await http.get<RowsPage>(`/datasets/${id}/rows`, { params: query })
  return data
}

/** Loads up to `limit` rows (several pages of 200) to draw the recommended charts. */
export async function getSampleRows(id: number, limit = 1000): Promise<RowsPage['content']> {
  const size = 200
  const rows: RowsPage['content'] = []
  for (let page = 0; rows.length < limit; page++) {
    const result = await getRows(id, { page, size })
    rows.push(...result.content)
    if (result.content.length < size) break
  }
  return rows.slice(0, limit)
}

export async function importDataset(payload: ImportPayload): Promise<DatasetSummary> {
  const form = new FormData()
  form.append('file', payload.file)
  form.append('title', payload.title)
  if (payload.description) form.append('description', payload.description)
  if (payload.category) form.append('category', payload.category)
  if (payload.source) form.append('source', payload.source)
  const { data } = await http.post<DatasetSummary>('/datasets', form)
  return data
}

export async function deleteDataset(id: number): Promise<void> {
  await http.delete(`/datasets/${id}`)
}

/** Message to show to the user for any error thrown by the functions above. */
export function errorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const problem = error.response?.data as Problem | undefined
    if (problem?.detail) return problem.detail
    if (error.response?.status === 401) return 'Session expirée, reconnectez-vous.'
    if (error.response?.status === 403) return "Vous n'avez pas les droits pour cette action."
    if (!error.response) return 'Serveur injoignable.'
  }
  return 'Une erreur inattendue est survenue.'
}

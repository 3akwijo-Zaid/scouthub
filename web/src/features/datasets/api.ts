import { api, toApiError } from '@/lib/api'
import type { DatasetDetail, DatasetSummary, RowsPage, RowsQuery } from './types'

/**
 * Calls to the datasets endpoints. They go through the shared client, so the token is sent
 * on every request and an expired session sends the user back to the login page.
 */

export interface ImportPayload {
  file: File
  title: string
  description?: string
  category?: string
  source?: string
}

export async function listDatasets(q?: string, category?: string): Promise<DatasetSummary[]> {
  const { data } = await api.get<DatasetSummary[]>('/datasets', {
    params: { q: q || undefined, category: category || undefined },
  })
  return data
}

export async function getDataset(id: number): Promise<DatasetDetail> {
  const { data } = await api.get<DatasetDetail>(`/datasets/${id}`)
  return data
}

export async function getRows(id: number, query: RowsQuery): Promise<RowsPage> {
  const { data } = await api.get<RowsPage>(`/datasets/${id}/rows`, { params: query })
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
  const { data } = await api.post<DatasetSummary>('/datasets', form)
  return data
}

export async function deleteDataset(id: number): Promise<void> {
  await api.delete(`/datasets/${id}`)
}

/** Message to show to the user for any error thrown by the functions above. */
export function errorMessage(error: unknown): string {
  const { status, message } = toApiError(error)
  if (status === 403 && message === 'Une erreur inattendue est survenue.') {
    return "Vous n'avez pas les droits pour cette action."
  }
  return message
}

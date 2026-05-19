import { apiFetch } from './client'
import type { LogQueryResult } from '../types/api'

export interface LogQueryParams {
  page?: number
  page_size?: number
  since?: string
  until?: string
  request_id?: string
  level?: string
  q?: string
}

export function fetchLogs(params: LogQueryParams = {}): Promise<LogQueryResult> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  if (params.since) search.set('since', params.since)
  if (params.until) search.set('until', params.until)
  if (params.request_id) search.set('request_id', params.request_id)
  if (params.level) search.set('level', params.level)
  if (params.q) search.set('q', params.q)
  const qs = search.toString()
  return apiFetch<LogQueryResult>(`/api/v1/admin/logs${qs ? `?${qs}` : ''}`)
}

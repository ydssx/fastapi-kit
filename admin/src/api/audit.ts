import { apiFetch, getStoredTokens } from './client'
import type { AuditLog, Paginated } from '../types/api'

export interface AuditListParams {
  page?: number
  page_size?: number
  action?: string
  resource_type?: string
  since?: string
  until?: string
}

export function fetchAuditLogs(params: AuditListParams = {}): Promise<Paginated<AuditLog>> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  if (params.action) search.set('action', params.action)
  if (params.resource_type) search.set('resource_type', params.resource_type)
  if (params.since) search.set('since', params.since)
  if (params.until) search.set('until', params.until)
  const qs = search.toString()
  return apiFetch<Paginated<AuditLog>>(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ''}`)
}

export async function downloadAuditExport(params: Omit<AuditListParams, 'page' | 'page_size'> = {}) {
  const search = new URLSearchParams()
  if (params.action) search.set('action', params.action)
  if (params.resource_type) search.set('resource_type', params.resource_type)
  if (params.since) search.set('since', params.since)
  if (params.until) search.set('until', params.until)
  const tokens = getStoredTokens()
  const response = await fetch(
    `/api/v1/admin/audit-logs/export${search.toString() ? `?${search}` : ''}`,
    {
      headers: tokens?.access_token
        ? { Authorization: `Bearer ${tokens.access_token}` }
        : undefined,
    },
  )
  if (!response.ok) {
    throw new Error('导出失败')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'audit-logs.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

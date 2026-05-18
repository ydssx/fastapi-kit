import { apiFetch } from './client'
import type { AuditLog, Paginated } from '../types/api'

export interface AuditListParams {
  page?: number
  page_size?: number
  action?: string
  resource_type?: string
}

export function fetchAuditLogs(params: AuditListParams = {}): Promise<Paginated<AuditLog>> {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  if (params.action) search.set('action', params.action)
  if (params.resource_type) search.set('resource_type', params.resource_type)
  const qs = search.toString()
  return apiFetch<Paginated<AuditLog>>(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ''}`)
}

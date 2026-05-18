import { apiFetch } from './client'
import type { CeleryOverview } from '../types/api'

export function fetchCeleryOverview(): Promise<CeleryOverview> {
  return apiFetch<CeleryOverview>('/api/v1/admin/celery/overview')
}

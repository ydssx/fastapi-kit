import type { Usage } from '../types/api'
import { apiFetch } from './client'

export function fetchUsage(): Promise<Usage> {
  return apiFetch<Usage>('/api/v1/creator/usage')
}

import { apiFetch } from './client'
import type { DashboardStats } from '../types/api'

export function fetchDashboard(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/api/v1/admin/dashboard')
}

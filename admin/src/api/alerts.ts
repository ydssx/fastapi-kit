import { apiFetch } from './client'
import type { AlertDelivery, AlertSettings, AlertTestResult, Paginated } from '../types/api'

export interface AlertSettingsUpdate {
  webhook_url?: string | null
  webhook_secret?: string | null
  clear_webhook_secret?: boolean
  recovery_notifications_enabled?: boolean
}

export function fetchAlertSettings(): Promise<AlertSettings> {
  return apiFetch<AlertSettings>('/api/v1/admin/alerts/settings')
}

export function updateAlertSettings(payload: AlertSettingsUpdate): Promise<AlertSettings> {
  return apiFetch<AlertSettings>('/api/v1/admin/alerts/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchAlertDeliveries(page = 1, pageSize = 20): Promise<Paginated<AlertDelivery>> {
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  return apiFetch<Paginated<AlertDelivery>>(`/api/v1/admin/alerts/deliveries?${qs}`)
}

export function sendAlertTest(): Promise<AlertTestResult> {
  return apiFetch<AlertTestResult>('/api/v1/admin/alerts/test', { method: 'POST' })
}

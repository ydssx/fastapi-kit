import type { BrandProfile } from '../types/api'
import { apiFetch } from './client'

export function fetchBrand(): Promise<BrandProfile> {
  return apiFetch<BrandProfile>('/api/v1/creator/brand-profile')
}

export function updateBrand(payload: BrandProfile): Promise<BrandProfile> {
  return apiFetch<BrandProfile>('/api/v1/creator/brand-profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

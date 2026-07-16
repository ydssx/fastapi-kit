import type {
  MediaAsset,
  MediaAssociation,
  MediaAssetList,
  MediaPreview,
  ProjectMediaAssociation,
} from '../types/api'
import { apiFetch } from './client'

export interface MediaFilters {
  keyword?: string
  category?: string
  tags?: string[]
}

function mediaQuery(filters: MediaFilters): string {
  const params = new URLSearchParams()
  if (filters.keyword) params.set('keyword', filters.keyword)
  if (filters.category) params.set('category', filters.category)
  filters.tags?.forEach((tag) => params.append('tags', tag))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function fetchProjectMediaAssociations(projectId: string): Promise<ProjectMediaAssociation[]> {
  return apiFetch<ProjectMediaAssociation[]>(
    `/api/v1/creator/projects/${projectId}/media-associations`,
  )
}

export function fetchMedia(filters: MediaFilters = {}): Promise<MediaAssetList> {
  return apiFetch<MediaAssetList>(`/api/v1/creator/media${mediaQuery(filters)}`)
}

export function uploadMedia(
  file: File,
  payload: { category: string; tags: string[] },
): Promise<MediaAsset> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', payload.category)
  payload.tags.forEach((tag) => formData.append('tags', tag))
  return apiFetch<MediaAsset>('/api/v1/creator/media/upload', {
    method: 'POST',
    body: formData,
  })
}

export function importMedia(payload: {
  url: string
  filename: string
  category: string
  tags: string[]
}): Promise<MediaAsset> {
  return apiFetch<MediaAsset>('/api/v1/creator/media/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function generateMedia(payload: {
  prompt: string
  category: string
  tags: string[]
  size: '1024x1024' | '1024x1536' | '1536x1024'
}): Promise<MediaAsset> {
  return apiFetch<MediaAsset>('/api/v1/creator/media/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateMedia(
  assetId: string,
  payload: { filename?: string; category?: string; tags?: string[] },
): Promise<MediaAsset> {
  return apiFetch<MediaAsset>(`/api/v1/creator/media/${assetId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteMedia(assetId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/creator/media/${assetId}`, { method: 'DELETE' })
}

export function fetchMediaPreview(assetId: string): Promise<MediaPreview> {
  return apiFetch<MediaPreview>(`/api/v1/creator/media/${assetId}/preview`)
}

export function associateMedia(
  assetId: string,
  payload: { project_id: string; step_key: string; reference_position: string },
): Promise<MediaAssociation> {
  return apiFetch<MediaAssociation>(`/api/v1/creator/media/${assetId}/associations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function disassociateMedia(assetId: string, associationId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/creator/media/${assetId}/associations/${associationId}`, {
    method: 'DELETE',
  })
}

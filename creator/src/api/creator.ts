import type {
  AiSuggestResponse,
  BrandProfile,
  MediaAsset,
  MediaAssociation,
  MediaAssetList,
  MediaPreview,
  Pipeline,
  PlaygroundHandoffResponse,
  PlaygroundMessage,
  PlaygroundOutline,
  PlaygroundOutlineGenerateResponse,
  PlaygroundOutlineRefineResponse,
  PlaygroundRefineResponse,
  PlaygroundTopic,
  PlaygroundTopicsResponse,
  Project,
  ProjectMediaAssociation,
  PublishChecklistItem,
  Usage,
} from '../types/api'
import { apiFetch } from './client'

export function fetchPipelines(): Promise<Pipeline[]> {
  return apiFetch<Pipeline[]>('/api/v1/creator/pipelines')
}

export function fetchProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/api/v1/creator/projects')
}

export function fetchProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/v1/creator/projects/${id}`)
}

export function fetchProjectMediaAssociations(projectId: string): Promise<ProjectMediaAssociation[]> {
  return apiFetch<ProjectMediaAssociation[]>(
    `/api/v1/creator/projects/${projectId}/media-associations`,
  )
}

export function createProject(payload: {
  pipeline_id: string
  title: string
  target_platform_keys: string[]
  primary_platform_key?: string | null
}): Promise<Project> {
  return apiFetch<Project>('/api/v1/creator/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function saveDraft(
  projectId: string,
  stepKey: string,
  content: string,
): Promise<Project> {
  return apiFetch<Project>(`/api/v1/creator/projects/${projectId}/steps/${stepKey}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export function confirmStep(
  projectId: string,
  stepKey: string,
  content: string,
): Promise<Project> {
  return apiFetch<Project>(
    `/api/v1/creator/projects/${projectId}/steps/${stepKey}/confirm`,
    { method: 'POST', body: JSON.stringify({ content }) },
  )
}

export function aiSuggest(
  projectId: string,
  stepKey: string,
  adjustment?: string,
): Promise<AiSuggestResponse> {
  return apiFetch<AiSuggestResponse>(
    `/api/v1/creator/projects/${projectId}/steps/${stepKey}/ai-suggest`,
    {
      method: 'POST',
      body: JSON.stringify(adjustment ? { adjustment } : {}),
    },
  )
}

export function fetchPublishChecklist(projectId: string): Promise<PublishChecklistItem[]> {
  return apiFetch<PublishChecklistItem[]>(
    `/api/v1/creator/projects/${projectId}/publish-checklist`,
  )
}

export function updatePublishChecklist(
  projectId: string,
  checked_keys: string[],
): Promise<PublishChecklistItem[]> {
  return apiFetch<PublishChecklistItem[]>(
    `/api/v1/creator/projects/${projectId}/publish-checklist`,
    { method: 'PATCH', body: JSON.stringify({ checked_keys }) },
  )
}

export function completeProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/api/v1/creator/projects/${projectId}/complete`, {
    method: 'POST',
  })
}

export function updateProject(
  projectId: string,
  payload: {
    title?: string
    target_platform_keys?: string[]
    primary_platform_key?: string | null
  },
): Promise<Project> {
  return apiFetch<Project>(`/api/v1/creator/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteProject(projectId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/creator/projects/${projectId}`, {
    method: 'DELETE',
  })
}

export function openStep(projectId: string, stepKey: string): Promise<Project> {
  return apiFetch<Project>(
    `/api/v1/creator/projects/${projectId}/steps/${stepKey}/open`,
    { method: 'POST' },
  )
}

export function fetchUsage(): Promise<Usage> {
  return apiFetch<Usage>('/api/v1/creator/usage')
}

export function playgroundTopics(payload?: { seed?: string }): Promise<PlaygroundTopicsResponse> {
  return apiFetch('/api/v1/creator/playground/topics', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  })
}

export function playgroundRefine(payload: {
  selected_topic: PlaygroundTopic
  messages: PlaygroundMessage[]
}): Promise<PlaygroundRefineResponse> {
  return apiFetch('/api/v1/creator/playground/refine', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function playgroundOutlineGenerate(payload: {
  selected_topic: PlaygroundTopic
}): Promise<PlaygroundOutlineGenerateResponse> {
  return apiFetch('/api/v1/creator/playground/outline', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function playgroundOutlineRefine(payload: {
  selected_topic: PlaygroundTopic
  outline: PlaygroundOutline
  messages: PlaygroundMessage[]
}): Promise<PlaygroundOutlineRefineResponse> {
  return apiFetch('/api/v1/creator/playground/outline/refine', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function playgroundHandoff(payload: {
  pipeline_id: string
  title: string
  brief: string
  hooks?: string
  outline?: PlaygroundOutline
  raw_notes?: string
  target_platform_keys: string[]
  primary_platform_key?: string | null
}): Promise<PlaygroundHandoffResponse> {
  return apiFetch('/api/v1/creator/playground/handoff', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchBrand(): Promise<BrandProfile> {
  return apiFetch<BrandProfile>('/api/v1/creator/brand-profile')
}

export function updateBrand(payload: BrandProfile): Promise<BrandProfile> {
  return apiFetch<BrandProfile>('/api/v1/creator/brand-profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

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

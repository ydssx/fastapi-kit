import type {
  BrandProfile,
  Pipeline,
  Project,
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

export function createProject(payload: {
  pipeline_id: string
  title: string
  target_platform_keys: string[]
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

export function aiSuggest(projectId: string, stepKey: string): Promise<{ suggestion: string }> {
  return apiFetch<{ suggestion: string }>(
    `/api/v1/creator/projects/${projectId}/steps/${stepKey}/ai-suggest`,
    { method: 'POST' },
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

export function fetchUsage(): Promise<Usage> {
  return apiFetch<Usage>('/api/v1/creator/usage')
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

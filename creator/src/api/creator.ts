import type {
  BrandProfile,
  Pipeline,
  PlaygroundMessage,
  PlaygroundHandoffResponse,
  PlaygroundRefineResponse,
  PlaygroundTopic,
  PlaygroundTopicsResponse,
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
): Promise<{ suggestion: string }> {
  return apiFetch<{ suggestion: string }>(
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

export function playgroundTopics(): Promise<PlaygroundTopicsResponse> {
  return apiFetch('/api/v1/creator/playground/topics', { method: 'POST' })
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

export function playgroundHandoff(payload: {
  pipeline_id: string
  title: string
  brief: string
  hooks?: string
  raw_notes?: string
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

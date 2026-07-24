import type {
  PlaygroundHandoffResponse,
  PlaygroundMessage,
  PlaygroundOutline,
  PlaygroundOutlineGenerateResponse,
  PlaygroundOutlineRefineResponse,
  PlaygroundRefineResponse,
  PlaygroundTopic,
  PlaygroundTopicsResponse,
} from '../types/api'
import { apiFetch } from './client'

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

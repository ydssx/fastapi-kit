import type { AiSuggestResponse } from '../types/api'
import { apiFetch } from './client'

export interface AiSuggestOptions {
  mode?: 'selection'
  selectedText?: string
}

export function aiSuggest(
  projectId: string,
  stepKey: string,
  adjustment?: string,
  options?: AiSuggestOptions,
): Promise<AiSuggestResponse> {
  const body: {
    adjustment?: string
    mode?: 'selection'
    selected_text?: string
  } = {}
  if (adjustment) body.adjustment = adjustment
  if (options?.mode === 'selection' || options?.selectedText !== undefined) {
    body.mode = 'selection'
    body.selected_text = options?.selectedText ?? ''
  }

  return apiFetch<AiSuggestResponse>(
    `/api/v1/creator/projects/${projectId}/steps/${stepKey}/ai-suggest`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

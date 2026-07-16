import type { AiSuggestResponse } from '../types/api'
import { apiFetch } from './client'

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

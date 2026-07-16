import { useMutation, type QueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { aiSuggest, confirmStep, openStep } from '../api/creator'
import { shouldAutoSuggest } from '../lib/stepAiAdjustments'
import type { AiVariant, Project } from '../types/api'
import type { QuotaLimitKind } from '../components/QuotaLimitNotice'

type ApplyProjectUpdate = (
  updated: Project,
  options?: { syncContent?: boolean; onSyncContent?: (content: string) => void },
) => void

interface UseProjectStepAiArgs {
  projectId: string | undefined
  project: Project | undefined
  step: { key: string; title: string; ai_enabled: boolean } | undefined
  stepIndex: number
  isPublish: boolean
  content: string
  setContent: (value: string | ((current: string) => string)) => void
  applyProjectUpdate: ApplyProjectUpdate
  handleApiError: (err: unknown) => void
  setQuotaError: (value: QuotaLimitKind | null) => void
  setActionError: (value: string | null) => void
  setDraftSaveError: (value: boolean) => void
  setDraftSavedFlash: (value: boolean) => void
  markAutosaveSkip: () => void
  showToast: (message: string) => void
  queryClient: QueryClient
}

export function useProjectStepAi({
  projectId,
  project,
  step,
  stepIndex,
  isPublish,
  content,
  setContent,
  applyProjectUpdate,
  handleApiError,
  setQuotaError,
  setActionError,
  setDraftSaveError,
  setDraftSavedFlash,
  markAutosaveSkip,
  showToast,
  queryClient,
}: UseProjectStepAiArgs) {
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [variants, setVariants] = useState<AiVariant[]>([])

  const confirmMut = useMutation({
    mutationFn: () => confirmStep(projectId!, project!.current_step_key, content),
    onSuccess: (updated) => {
      setQuotaError(null)
      setActionError(null)
      setDraftSaveError(false)
      setDraftSavedFlash(false)
      applyProjectUpdate(updated, {
        onSyncContent: (next) => {
          markAutosaveSkip()
          setContent(next)
        },
      })
      showToast('已进入下一步')
    },
    onError: handleApiError,
  })

  const aiMut = useMutation({
    mutationFn: (adjustment?: string) =>
      aiSuggest(projectId!, project!.current_step_key, adjustment),
    onSuccess: (data) => {
      setQuotaError(null)
      setActionError(null)
      setSuggestion(data.suggestion)
      setVariants(data.variants ?? [])
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: handleApiError,
  })

  const openMut = useMutation({
    mutationFn: (stepKey: string) => openStep(projectId!, stepKey),
    onSuccess: (updated) => {
      setActionError(null)
      applyProjectUpdate(updated, {
        onSyncContent: (next) => {
          markAutosaveSkip()
          setContent(next)
        },
      })
    },
    onError: handleApiError,
  })

  useEffect(() => {
    if (!project || !step || isPublish) return
    setSuggestion(null)
    setVariants([])
    const draft = project.draft_content[project.current_step_key] ?? ''
    if (shouldAutoSuggest(stepIndex, step.ai_enabled, !draft.trim())) {
      aiMut.mutate(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on step change
  }, [project?.current_step_key])

  return {
    suggestion,
    variants,
    setSuggestion,
    confirmMut,
    aiMut,
    openMut,
  }
}

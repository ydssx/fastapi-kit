import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchBrand, fetchPipelines, fetchProject } from '../api/creator'
import { creatorApiErrorMessage } from '../lib/errors'
import {
  quotaLimitKindFromCode,
  type QuotaLimitKind,
} from '../components/QuotaLimitNotice'
import type { Project } from '../types/api'

export function useProjectDetail(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const [quotaError, setQuotaError] = useState<QuotaLimitKind | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
  })
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: fetchPipelines,
  })
  const brandQuery = useQuery({
    queryKey: ['brand'],
    queryFn: fetchBrand,
  })

  const project = projectQuery.data
  const pipelines = pipelinesQuery.data ?? []
  const brand = brandQuery.data ?? {
    tone: '',
    audience: '',
    taboos: '',
    structure_notes: '',
  }
  const pipeline = pipelines.find((p) => p.id === project?.pipeline_id)
  const step = pipeline?.steps.find((s) => s.key === project?.current_step_key)
  const stepIndex = pipeline?.steps.findIndex((s) => s.key === project?.current_step_key) ?? 0
  const isPublish = project?.current_step_key === 'publish'
  const canEditPlatforms = project?.status !== 'completed' && !isPublish

  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      const kind = quotaLimitKindFromCode(err.code)
      if (kind) {
        setQuotaError(kind)
        setActionError(null)
        return
      }
      setActionError(creatorApiErrorMessage(err.code, err.message))
      return
    }
    setActionError(err instanceof Error ? err.message : '操作失败')
  }, [])

  const applyProjectUpdate = useCallback(
    (
      updated: Project,
      options?: {
        syncContent?: boolean
        onSyncContent?: (content: string) => void
      },
    ) => {
      queryClient.setQueryData(['project', projectId], updated)
      if (options?.syncContent !== false) {
        options?.onSyncContent?.(updated.draft_content[updated.current_step_key] ?? '')
      }
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    [projectId, queryClient],
  )

  function stepTitle(key: string) {
    return pipeline?.steps.find((s) => s.key === key)?.title ?? key
  }

  function prevStepContext() {
    if (!pipeline || !project || stepIndex <= 0) return { title: undefined, summary: undefined }
    const prev = pipeline.steps[stepIndex - 1]
    const art = [...project.artifacts]
      .filter((a) => a.step_key === prev.key)
      .sort((a, b) => b.version - a.version)[0]
    return { title: prev.title, summary: art?.content }
  }

  return {
    project,
    isLoading: projectQuery.isLoading,
    pipelines,
    brand,
    pipeline,
    step,
    stepIndex,
    isPublish,
    canEditPlatforms,
    quotaError,
    setQuotaError,
    actionError,
    setActionError,
    handleApiError,
    applyProjectUpdate,
    stepTitle,
    prevStepContext,
    queryClient,
  }
}

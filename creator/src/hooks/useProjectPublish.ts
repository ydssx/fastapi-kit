import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query'
import {
  completeProject,
  fetchPublishChecklist,
  updatePublishChecklist,
} from '../api/creator'
import type { QuotaLimitKind } from '../components/QuotaLimitNotice'
import type { Project, PublishChecklistItem } from '../types/api'

type ApplyProjectUpdate = (
  updated: Project,
  options?: { syncContent?: boolean; onSyncContent?: (content: string) => void },
) => void

interface UseProjectPublishArgs {
  projectId: string | undefined
  isPublish: boolean
  applyProjectUpdate: ApplyProjectUpdate
  handleApiError: (err: unknown) => void
  setQuotaError: (value: QuotaLimitKind | null) => void
  setActionError: (value: string | null) => void
  markAutosaveSkip: () => void
  setContent: (value: string) => void
  queryClient: QueryClient
}

export function useProjectPublish({
  projectId,
  isPublish,
  applyProjectUpdate,
  handleApiError,
  setQuotaError,
  setActionError,
  markAutosaveSkip,
  setContent,
  queryClient,
}: UseProjectPublishArgs) {
  const { data: checklist = [] } = useQuery({
    queryKey: ['checklist', projectId],
    queryFn: () => fetchPublishChecklist(projectId!),
    enabled: !!projectId && isPublish,
  })

  const completeMut = useMutation({
    mutationFn: () => completeProject(projectId!),
    onSuccess: (updated) => {
      setQuotaError(null)
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

  const checklistMut = useMutation({
    mutationFn: (keys: string[]) => updatePublishChecklist(projectId!, keys),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checklist', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  function checklistKey(item: PublishChecklistItem) {
    return `${item.platform}:${item.item_key}`
  }

  function toggleCheck(item: PublishChecklistItem) {
    const key = checklistKey(item)
    const current = checklist.filter((c) => c.checked).map(checklistKey)
    const next = item.checked ? current.filter((k) => k !== key) : [...current, key]
    checklistMut.mutate(next)
  }

  return {
    checklist,
    completeMut,
    checklistMut,
    toggleCheck,
  }
}

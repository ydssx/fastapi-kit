import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { saveDraft } from '../api/creator'
import type { DraftSaveStatus } from '../components/StepEditorPanel'
import type { Project } from '../types/api'

type ApplyProjectUpdate = (
  updated: Project,
  options?: { syncContent?: boolean; onSyncContent?: (content: string) => void },
) => void

interface UseProjectDraftAutosaveArgs {
  projectId: string | undefined
  project: Project | undefined
  isPublish: boolean
  content: string
  setContent: (value: string | ((current: string) => string)) => void
  blockedRef: MutableRefObject<boolean>
  applyProjectUpdate: ApplyProjectUpdate
  handleApiError: (err: unknown) => void
  setActionError: (value: string | null) => void
  showToast: (message: string) => void
}

export function useProjectDraftAutosave({
  projectId,
  project,
  isPublish,
  content,
  setContent,
  blockedRef,
  applyProjectUpdate,
  handleApiError,
  setActionError,
  showToast,
}: UseProjectDraftAutosaveArgs) {
  const [draftSaveError, setDraftSaveError] = useState(false)
  const [draftSavedFlash, setDraftSavedFlash] = useState(false)
  const autosaveSkipRef = useRef(false)

  useEffect(() => {
    if (project) {
      autosaveSkipRef.current = true
      setContent(project.draft_content[project.current_step_key] ?? '')
      setDraftSaveError(false)
      setDraftSavedFlash(false)
    }
    // Intentionally keyed by identity/step — full project object would retrigger on draft saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.current_step_key, setContent])

  const draftMut = useMutation({
    mutationFn: ({ text }: { text: string; toast?: boolean }) =>
      saveDraft(projectId!, project!.current_step_key, text),
    onSuccess: (updated, vars) => {
      setActionError(null)
      setDraftSaveError(false)
      setDraftSavedFlash(true)
      applyProjectUpdate(updated, { syncContent: false })
      if (vars.toast) showToast('草稿已保存')
    },
    onError: (err) => {
      setDraftSaveError(true)
      handleApiError(err)
    },
  })

  const serverDraft =
    project && !isPublish ? (project.draft_content[project.current_step_key] ?? '') : ''
  const isDraftDirty = Boolean(
    project && project.status !== 'completed' && !isPublish && content !== serverDraft,
  )

  useEffect(() => {
    if (isDraftDirty) setDraftSavedFlash(false)
  }, [isDraftDirty])

  useEffect(() => {
    if (!draftSavedFlash) return
    const timer = window.setTimeout(() => setDraftSavedFlash(false), 2500)
    return () => window.clearTimeout(timer)
  }, [draftSavedFlash])

  useEffect(() => {
    if (autosaveSkipRef.current) {
      autosaveSkipRef.current = false
      return
    }
    if (!project || isPublish || project.status === 'completed') return
    if (!isDraftDirty) return
    if (blockedRef.current || draftMut.isPending) return

    const text = content
    const timer = window.setTimeout(() => {
      if (blockedRef.current) return
      draftMut.mutate({ text, toast: false })
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [blockedRef, content, draftMut, isDraftDirty, isPublish, project])

  const draftStatus: DraftSaveStatus = draftMut.isPending
    ? 'saving'
    : draftSaveError && isDraftDirty
      ? 'error'
      : isDraftDirty
        ? 'dirty'
        : draftSavedFlash
          ? 'saved'
          : 'idle'

  function markAutosaveSkip() {
    autosaveSkipRef.current = true
  }

  return {
    draftMut,
    draftStatus,
    markAutosaveSkip,
    setDraftSaveError,
    setDraftSavedFlash,
  }
}

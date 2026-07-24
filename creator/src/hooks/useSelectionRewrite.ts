import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { aiSuggest } from '../api/creator'
import {
  applySelectionInsertion,
  hasActiveSelection,
  type TextSelection,
} from '../lib/editorSelection'
import { adjustmentsForStep } from '../lib/stepAiAdjustments'
import type { QuotaLimitKind } from '../components/QuotaLimitNotice'

export interface SelectionRewriteController {
  showFloat: boolean
  chips: { label: string; adjustment: string }[]
  loading: boolean
  preview: string | null
  locked: boolean
  onRewrite: (adjustment: string) => void
  onRegenerate: () => void
  onConfirm: () => void
  onCancel: () => void
}

interface UseSelectionRewriteArgs {
  projectId: string | undefined
  stepKey: string | undefined
  aiEnabled: boolean
  isPublish: boolean
  content: string
  selection: TextSelection | null
  setContent: (value: string | ((current: string) => string)) => void
  setSelection: (value: TextSelection | null) => void
  handleApiError: (err: unknown) => void
  setQuotaError: (value: QuotaLimitKind | null) => void
  setActionError?: (value: string | null) => void
  /** Flush local draft to server before selection rewrite (skips when already clean). */
  flushDraft?: () => Promise<void>
  aiPending?: boolean
  quotaBlocked?: boolean
}

const FALLBACK_CHIPS = [{ label: '改写选中', adjustment: '改写选中片段，保持原意' }]

function hasRewritableSelection(selection: TextSelection | null, content: string): boolean {
  if (!hasActiveSelection(selection, content) || selection === null) return false
  return content.slice(selection.start, selection.end).trim().length > 0
}

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true
  return err instanceof Error && err.name === 'AbortError'
}

export function useSelectionRewrite({
  projectId,
  stepKey,
  aiEnabled,
  isPublish,
  content,
  selection,
  setContent,
  setSelection,
  handleApiError,
  setQuotaError,
  setActionError,
  flushDraft,
  aiPending = false,
  quotaBlocked = false,
}: UseSelectionRewriteArgs): SelectionRewriteController {
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<string | null>(null)
  const [lockedSelection, setLockedSelection] = useState<TextSelection | null>(null)
  const [lastAdjustment, setLastAdjustment] = useState<string | null>(null)
  /** False after user cancel so pending network no longer locks the editor. */
  const [requestOwned, setRequestOwned] = useState(false)
  const cancelledRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const chips =
    stepKey && adjustmentsForStep(stepKey).length > 0
      ? adjustmentsForStep(stepKey)
      : FALLBACK_CHIPS

  useEffect(() => {
    cancelledRef.current = true
    abortRef.current?.abort()
    abortRef.current = null
    setPreview(null)
    setLockedSelection(null)
    setLastAdjustment(null)
    setRequestOwned(false)
  }, [projectId, stepKey])

  const rewriteMut = useMutation({
    mutationFn: (adjustment: string) => {
      const sel = lockedSelection ?? selection
      const sourceContent = lockedSelection?.value ?? content
      if (!projectId || !stepKey || !sel) {
        return Promise.reject(new Error('no selection'))
      }
      const selectedText = sourceContent.slice(sel.start, sel.end).trim()
      if (!selectedText) {
        return Promise.reject(new Error('no selection'))
      }
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      return aiSuggest(projectId, stepKey, adjustment, {
        mode: 'selection',
        selectedText,
        signal: ac.signal,
      })
    },
    onMutate: (adjustment) => {
      cancelledRef.current = false
      setRequestOwned(true)
      setLastAdjustment(adjustment)
      const hadPreview = preview !== null
      if (!lockedSelection && hasRewritableSelection(selection, content) && selection) {
        setLockedSelection(selection)
      }
      return { hadPreview }
    },
    onSuccess: (data) => {
      if (cancelledRef.current) return
      setQuotaError(null)
      setPreview(data.suggestion)
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: (err, _adjustment, ctx) => {
      if (cancelledRef.current || isAbortError(err)) return
      if (!ctx?.hadPreview) {
        setLockedSelection(null)
        setPreview(null)
        setLastAdjustment(null)
        setRequestOwned(false)
      }
      handleApiError(err)
    },
    onSettled: () => {
      if (cancelledRef.current) {
        setRequestOwned(false)
      }
    },
  })

  const requestActive = rewriteMut.isPending && requestOwned
  const locked = preview !== null || requestActive
  const blocked = aiPending || quotaBlocked || requestActive
  // Keep float reachable while locked even if quota just failed (Cancel must remain).
  const showFloat =
    !!aiEnabled &&
    !isPublish &&
    (locked || (!quotaBlocked && hasRewritableSelection(selection, content)))

  function clearSession() {
    cancelledRef.current = true
    abortRef.current?.abort()
    abortRef.current = null
    setPreview(null)
    setLockedSelection(null)
    setLastAdjustment(null)
    setRequestOwned(false)
  }

  function confirmPreview() {
    if (preview === null || !lockedSelection || requestActive) return
    if (content !== lockedSelection.value) {
      setActionError?.('稿面在预览期间已变化，请取消后重新改写')
      clearSession()
      return
    }
    const result = applySelectionInsertion(lockedSelection.value, lockedSelection, preview)
    setContent(result.content)
    setSelection(result.selection)
    clearSession()
  }

  function cancelPreview() {
    clearSession()
  }

  async function startRewrite(adjustment: string) {
    if (locked || blocked) return
    try {
      await flushDraft?.()
    } catch {
      return
    }
    if (aiPending || quotaBlocked) return
    rewriteMut.mutate(adjustment)
  }

  function regeneratePreview() {
    if (blocked || preview === null || !lastAdjustment || !lockedSelection) return
    rewriteMut.mutate(lastAdjustment)
  }

  return {
    showFloat,
    chips,
    locked,
    preview,
    loading: requestActive,
    onRewrite: (adjustment: string) => {
      void startRewrite(adjustment)
    },
    onRegenerate: regeneratePreview,
    onConfirm: confirmPreview,
    onCancel: cancelPreview,
  }
}

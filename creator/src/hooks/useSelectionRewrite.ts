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
  aiPending?: boolean
  quotaBlocked?: boolean
}

const FALLBACK_CHIPS = [{ label: '改写选中', adjustment: '改写选中片段，保持原意' }]

function hasRewritableSelection(selection: TextSelection | null, content: string): boolean {
  if (!hasActiveSelection(selection, content) || selection === null) return false
  return content.slice(selection.start, selection.end).trim().length > 0
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
  aiPending = false,
  quotaBlocked = false,
}: UseSelectionRewriteArgs): SelectionRewriteController {
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<string | null>(null)
  const [lockedSelection, setLockedSelection] = useState<TextSelection | null>(null)
  const [lastAdjustment, setLastAdjustment] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const chips =
    stepKey && adjustmentsForStep(stepKey).length > 0
      ? adjustmentsForStep(stepKey)
      : FALLBACK_CHIPS

  useEffect(() => {
    cancelledRef.current = true
    setPreview(null)
    setLockedSelection(null)
    setLastAdjustment(null)
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
      return aiSuggest(projectId, stepKey, adjustment, {
        mode: 'selection',
        selectedText,
      })
    },
    onMutate: (adjustment) => {
      cancelledRef.current = false
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
      if (cancelledRef.current) return
      if (!ctx?.hadPreview) {
        setLockedSelection(null)
        setPreview(null)
        setLastAdjustment(null)
      }
      handleApiError(err)
    },
  })

  const locked = preview !== null || rewriteMut.isPending
  const blocked = aiPending || quotaBlocked || rewriteMut.isPending
  const showFloat =
    !!aiEnabled &&
    !isPublish &&
    !quotaBlocked &&
    (locked || hasRewritableSelection(selection, content))

  function confirmPreview() {
    if (preview === null || !lockedSelection || rewriteMut.isPending) return
    const result = applySelectionInsertion(lockedSelection.value, lockedSelection, preview)
    setContent(result.content)
    setSelection(result.selection)
    setPreview(null)
    setLockedSelection(null)
    setLastAdjustment(null)
  }

  function cancelPreview() {
    cancelledRef.current = true
    setPreview(null)
    setLockedSelection(null)
    setLastAdjustment(null)
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
    loading: rewriteMut.isPending,
    onRewrite: (adjustment: string) => {
      if (locked || blocked) return
      rewriteMut.mutate(adjustment)
    },
    onRegenerate: regeneratePreview,
    onConfirm: confirmPreview,
    onCancel: cancelPreview,
  }
}

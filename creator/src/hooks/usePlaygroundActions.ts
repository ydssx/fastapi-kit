import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  playgroundHandoff,
  playgroundOutlineGenerate,
  playgroundOutlineRefine,
  playgroundRefine,
  playgroundTopics,
} from '../api/creator'
import type { HandoffPayload } from '../components/PlaygroundHandoffModal'
import type { QuotaLimitKind } from '../components/QuotaLimitNotice'
import { quotaLimitKindFromCode } from '../components/QuotaLimitNotice'
import { useToast } from '../components/Toast'
import type { PlaygroundSession } from './usePlaygroundSession'
import { removeTopicFromList, samePlaygroundTopic } from '../lib/playgroundTopics'

type SetSession = (
  updater: PlaygroundSession | ((prev: PlaygroundSession) => PlaygroundSession),
) => void

interface UsePlaygroundActionsOptions {
  session: PlaygroundSession
  setSession: SetSession
  persistSession: (next: PlaygroundSession) => void
  resetSession: () => void
  onHandoffClose: () => void
  onOutlineViewOpen: (open: boolean) => void
}

function applyApiError(
  err: unknown,
  fallback: string,
  setQuotaError: (kind: QuotaLimitKind | null) => void,
  setActionError: (message: string | null) => void,
) {
  if (err instanceof ApiError) {
    const kind = quotaLimitKindFromCode(err.code)
    if (kind) {
      setQuotaError(kind)
      return
    }
  }
  setActionError(err instanceof Error ? err.message : fallback)
}

export function usePlaygroundActions({
  session,
  setSession,
  persistSession,
  resetSession,
  onHandoffClose,
  onOutlineViewOpen,
}: UsePlaygroundActionsOptions) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [quotaError, setQuotaError] = useState<QuotaLimitKind | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function clearErrors() {
    setQuotaError(null)
    setActionError(null)
  }

  function invalidateUsage() {
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
  }

  const topicsMut = useMutation({
    mutationFn: () => playgroundTopics(),
    onSuccess: (data) => {
      clearErrors()
      setSession((prev) => ({
        ...prev,
        topics: data.topics,
        selectedTopic: null,
        selectedTopics: [],
        messages: [],
        understanding: null,
        brandEmpty: data.brand_empty,
        outline: null,
        outlineMessages: [],
      }))
      onOutlineViewOpen(false)
      invalidateUsage()
    },
    onError: (err: unknown) => applyApiError(err, '生成失败，请重试', setQuotaError, setActionError),
  })

  const refineMut = useMutation({
    mutationFn: (text: string) => {
      if (!session.selectedTopic) throw new Error('请先选择选题')
      const nextMessages = [...session.messages, { role: 'user' as const, content: text }]
      return playgroundRefine({
        selected_topic: session.selectedTopic,
        messages: nextMessages,
      }).then((data) => ({ data, nextMessages }))
    },
    onSuccess: ({ data, nextMessages }) => {
      clearErrors()
      setSession((prev) => ({
        ...prev,
        messages: [...nextMessages, { role: 'assistant', content: data.reply }],
        understanding: data.understanding ?? prev.understanding,
      }))
      invalidateUsage()
    },
    onError: (err: unknown) =>
      applyApiError(err, '优化想法失败，请重试', setQuotaError, setActionError),
  })

  const outlineGenerateMut = useMutation({
    mutationFn: () => {
      if (!session.selectedTopic) throw new Error('请先选择选题')
      return playgroundOutlineGenerate({ selected_topic: session.selectedTopic })
    },
    onSuccess: (data) => {
      clearErrors()
      setSession((prev) => ({
        ...prev,
        outline: data.outline,
        outlineMessages: [],
        brandEmpty: data.brand_empty || prev.brandEmpty,
      }))
      onOutlineViewOpen(true)
      invalidateUsage()
    },
    onError: (err: unknown) =>
      applyApiError(err, '大纲生成失败，请重试', setQuotaError, setActionError),
  })

  const outlineRefineMut = useMutation({
    mutationFn: (text: string) => {
      if (!session.selectedTopic || !session.outline) throw new Error('请先生成大纲')
      const nextMessages = [...session.outlineMessages, { role: 'user' as const, content: text }]
      return playgroundOutlineRefine({
        selected_topic: session.selectedTopic,
        outline: session.outline,
        messages: nextMessages,
      }).then((data) => ({ data, nextMessages }))
    },
    onSuccess: ({ data, nextMessages }) => {
      clearErrors()
      setSession((prev) => ({
        ...prev,
        outline: data.outline,
        outlineMessages: [
          ...nextMessages,
          { role: 'assistant', content: '已根据你的反馈更新结构化大纲。' },
        ],
      }))
      invalidateUsage()
    },
    onError: (err: unknown) =>
      applyApiError(err, '大纲调整失败，请重试', setQuotaError, setActionError),
  })

  const handoffMut = useMutation({
    mutationFn: async (payload: HandoffPayload) => {
      const sharedFields = {
        pipeline_id: payload.pipeline_id,
        target_platform_keys: payload.target_platform_keys,
        primary_platform_key: payload.primary_platform_key,
      }

      if (payload.mode === 'all') {
        const slate =
          session.selectedTopics.length > 0
            ? session.selectedTopics
            : session.selectedTopic
              ? [session.selectedTopic]
              : []
        const createdIds: string[] = []
        for (const topic of slate) {
          const isFocus =
            session.selectedTopic != null && samePlaygroundTopic(session.selectedTopic, topic)
          const result = await playgroundHandoff({
            ...sharedFields,
            title: topic.title,
            brief: isFocus ? payload.brief : topic.reason,
            hooks: isFocus ? payload.hooks : undefined,
            outline: isFocus ? payload.outline : undefined,
            raw_notes: isFocus ? payload.raw_notes : '',
          })
          createdIds.push(result.project_id)
        }
        return { mode: 'all' as const, projectIds: createdIds }
      }

      const result = await playgroundHandoff({
        ...sharedFields,
        title: payload.title,
        brief: payload.brief,
        hooks: payload.hooks,
        outline: payload.outline,
        raw_notes: payload.raw_notes,
      })
      return { mode: 'current' as const, projectId: result.project_id, focus: session.selectedTopic }
    },
    onSuccess: (data) => {
      onHandoffClose()
      onOutlineViewOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      invalidateUsage()

      if (data.mode === 'all') {
        resetSession()
        showToast(`已创建 ${data.projectIds.length} 个项目`)
        navigate('/')
        return
      }

      const handedOff = data.focus
      const prev = session
      const nextSlate = handedOff
        ? removeTopicFromList(prev.selectedTopics, handedOff)
        : prev.selectedTopics
      const nextFocus = nextSlate[0] ?? null
      persistSession({
        ...prev,
        selectedTopics: nextSlate,
        selectedTopic: nextFocus,
        messages: [],
        understanding: null,
        outline: null,
        outlineMessages: [],
      })
      navigate(`/projects/${data.projectId}`)
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : '创建项目失败')
    },
  })

  return {
    quotaError,
    actionError,
    quotaBlocked: quotaError === 'playground',
    topicsMut,
    refineMut,
    outlineGenerateMut,
    outlineRefineMut,
    handoffMut,
  }
}

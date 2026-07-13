import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  fetchPipelines,
  fetchUsage,
  playgroundHandoff,
  playgroundOutlineGenerate,
  playgroundOutlineRefine,
  playgroundRefine,
  playgroundTopics,
} from '../api/creator'
import { LoadingBlock } from '../components/LoadingBlock'
import { PlaygroundIcon } from '../components/icons/NavIcons'
import { PlaygroundHandoffModal } from '../components/PlaygroundHandoffModal'
import type { HandoffPayload } from '../components/PlaygroundHandoffModal'
import {
  PlaygroundProgress,
  resolvePlaygroundStage,
} from '../components/PlaygroundProgress'
import { PageHeader } from '../components/PageHeader'
import { PlaygroundOutlinePanel } from '../components/PlaygroundOutlinePanel'
import { PlaygroundRefinePanel } from '../components/PlaygroundRefinePanel'
import {
  PlaygroundTopicCards,
  PlaygroundTopicCardsActions,
} from '../components/PlaygroundTopicCards'
import { QuotaLimitNotice, quotaLimitKindFromCode } from '../components/QuotaLimitNotice'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { usePlaygroundSession } from '../hooks/usePlaygroundSession'
import {
  removeTopicFromList,
  samePlaygroundTopic,
  toggleTopicInList,
  topicInList,
} from '../lib/playgroundTopics'
import type { PlaygroundMessage, PlaygroundOutline, PlaygroundTopic } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './PlaygroundPage.module.css'

function hasOutlineSession(
  outline: PlaygroundOutline | null,
  outlineMessages: PlaygroundMessage[],
) {
  return outline !== null || outlineMessages.length > 0
}

export function PlaygroundPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirmDialog()
  const { showToast } = useToast()
  const { session, setSession, resetSession, exportSession } = usePlaygroundSession()
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [outlineViewOpen, setOutlineViewOpen] = useState(false)
  const [quotaError, setQuotaError] = useState<'ai' | 'projects' | 'playground' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: fetchUsage })

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: fetchPipelines,
  })

  const quotaBlocked = quotaError === 'playground'

  async function confirmClearOutline(actionLabel: string): Promise<boolean> {
    if (!hasOutlineSession(session.outline, session.outlineMessages)) return true
    return confirm({
      title: '清空结构化大纲',
      message: `${actionLabel}将清空当前结构化大纲，是否继续？`,
      confirmLabel: '继续',
      cancelLabel: '取消',
      variant: 'danger',
    })
  }

  const topicsMut = useMutation({
    mutationFn: () => playgroundTopics(),
    onSuccess: (data) => {
      setQuotaError(null)
      setActionError(null)
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
      setOutlineViewOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const kind = quotaLimitKindFromCode(err.code)
        if (kind) {
          setQuotaError(kind)
          return
        }
      }
      setActionError(err instanceof Error ? err.message : '生成失败，请重试')
    },
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
      setQuotaError(null)
      setActionError(null)
      setSession((prev) => ({
        ...prev,
        messages: [...nextMessages, { role: 'assistant', content: data.reply }],
        understanding: data.understanding ?? prev.understanding,
      }))
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const kind = quotaLimitKindFromCode(err.code)
        if (kind) {
          setQuotaError(kind)
          return
        }
      }
      setActionError(err instanceof Error ? err.message : '优化想法失败，请重试')
    },
  })

  const outlineGenerateMut = useMutation({
    mutationFn: () => {
      if (!session.selectedTopic) throw new Error('请先选择选题')
      return playgroundOutlineGenerate({ selected_topic: session.selectedTopic })
    },
    onSuccess: (data) => {
      setQuotaError(null)
      setActionError(null)
      setSession((prev) => ({
        ...prev,
        outline: data.outline,
        outlineMessages: [],
        brandEmpty: data.brand_empty || prev.brandEmpty,
      }))
      setOutlineViewOpen(true)
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const kind = quotaLimitKindFromCode(err.code)
        if (kind) {
          setQuotaError(kind)
          return
        }
      }
      setActionError(err instanceof Error ? err.message : '大纲生成失败，请重试')
    },
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
      setQuotaError(null)
      setActionError(null)
      setSession((prev) => ({
        ...prev,
        outline: data.outline,
        outlineMessages: [
          ...nextMessages,
          { role: 'assistant', content: '已根据你的反馈更新结构化大纲。' },
        ],
      }))
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        const kind = quotaLimitKindFromCode(err.code)
        if (kind) {
          setQuotaError(kind)
          return
        }
      }
      setActionError(err instanceof Error ? err.message : '大纲调整失败，请重试')
    },
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
            session.selectedTopic != null &&
            samePlaygroundTopic(session.selectedTopic, topic)
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
      setHandoffOpen(false)
      setOutlineViewOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['usage'] })

      if (data.mode === 'all') {
        resetSession()
        showToast(`已创建 ${data.projectIds.length} 个项目`)
        navigate('/')
        return
      }

      const handedOff = data.focus
      setSession((prev) => {
        const nextSlate = handedOff
          ? removeTopicFromList(prev.selectedTopics, handedOff)
          : prev.selectedTopics
        const nextFocus = nextSlate[0] ?? null
        return {
          ...prev,
          selectedTopics: nextSlate,
          selectedTopic: nextFocus,
          messages: [],
          understanding: null,
          outline: null,
          outlineMessages: [],
        }
      })
      navigate(`/projects/${data.projectId}`)
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : '创建项目失败')
    },
  })

  async function selectTopic(topic: PlaygroundTopic) {
    const topicChanged =
      session.selectedTopic &&
      (session.selectedTopic.title !== topic.title ||
        session.selectedTopic.reason !== topic.reason)

    if (topicChanged && session.messages.length > 0) {
      const ok = await confirm({
        title: '切换选题',
        message: '切换选题将清空当前选题的 refine 对话，是否继续？',
        confirmLabel: '切换选题',
        cancelLabel: '取消',
        variant: 'danger',
      })
      if (!ok) return
    }
    if (topicChanged && !(await confirmClearOutline('切换选题'))) return

    setSession((prev) => {
      const selectedTopics = topicInList(prev.selectedTopics, topic)
        ? prev.selectedTopics
        : [...prev.selectedTopics, topic]
      return {
        ...prev,
        selectedTopic: topic,
        selectedTopics,
        messages: topicChanged ? [] : prev.messages,
        understanding: topicChanged ? null : prev.understanding,
        outline: topicChanged ? null : prev.outline,
        outlineMessages: topicChanged ? [] : prev.outlineMessages,
      }
    })
    if (topicChanged) {
      setOutlineViewOpen(false)
    }
  }

  function toggleSlateTopic(topic: PlaygroundTopic) {
    setSession((prev) => {
      const next = toggleTopicInList(prev.selectedTopics, topic)
      // Keep focus topic in the slate when it is the active refine/outline target.
      if (
        prev.selectedTopic &&
        samePlaygroundTopic(prev.selectedTopic, topic) &&
        !topicInList(next, topic)
      ) {
        return prev
      }
      return { ...prev, selectedTopics: next }
    })
  }

  async function handleRegenerateTopics() {
    if (!(await confirmClearOutline('换一批选题'))) return
    topicsMut.mutate()
  }

  const brief = session.understanding ?? session.selectedTopic?.reason ?? ''
  const showOutlineWorkspace = Boolean(session.selectedTopic && outlineViewOpen)
  const playgroundStage = resolvePlaygroundStage({
    hasTopics: session.topics.length > 0,
    hasSelectedTopic: Boolean(session.selectedTopic),
    outlineOpen: showOutlineWorkspace,
  })

  return (
    <div className={styles.page}>
      {dialog}
      <PageHeader
        title="灵感实验室"
        description="生成选题、打磨结构化大纲，满意后再交接到内容流水线。"
      />

      {session.topics.length > 0 ? (
        <PlaygroundProgress
          current={playgroundStage.current}
          completed={playgroundStage.completed}
        />
      ) : null}

      <div className={styles.persistWarn} role="status">
        <span className={styles.persistLabel}>提示</span>
        关闭此标签页可能丢失未交接的内容。
        <button type="button" className={styles.linkBtn} onClick={exportSession}>
          导出会话 JSON
        </button>
      </div>

      {quotaError ? <QuotaLimitNotice kind={quotaError} /> : null}
      {actionError ? <p className={shared.error}>{actionError}</p> : null}

      {session.topics.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden>
            <PlaygroundIcon size={26} />
          </span>
          <p className={styles.emptyKicker}>灵感实验室</p>
          <h2 className={styles.emptyTitle}>不知道写什么？</h2>
          <p className={styles.emptyDesc}>
            我们将基于你的品牌档案生成 5–10 条可执行选题。无需先创建项目。
          </p>
          <button
            type="button"
            className={shared.btnPrimary}
            onClick={() => topicsMut.mutate()}
            disabled={topicsMut.isPending}
          >
            {topicsMut.isPending ? '生成中…' : '帮我找选题'}
          </button>
        </div>
      ) : (
        <>
          {session.brandEmpty ? (
            <p className={styles.brandWarn}>
              尚未完善品牌档案，选题质量可能一般。
              <Link to="/brand">去完善</Link>
            </p>
          ) : null}

          {!showOutlineWorkspace ? (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>选题清单</h2>
                <PlaygroundTopicCards
                  topics={session.topics}
                  selected={session.selectedTopic}
                  selectedTopics={session.selectedTopics}
                  onSelect={(topic) => void selectTopic(topic)}
                  onToggleSlate={toggleSlateTopic}
                />
                <PlaygroundTopicCardsActions
                  onRegenerate={() => void handleRegenerateTopics()}
                  loading={topicsMut.isPending}
                />
              </section>

              {session.selectedTopic ? (
                <section className={styles.refineSection}>
                  <h2 className={styles.sectionTitle}>优化想法：{session.selectedTopic.title}</h2>
                  <PlaygroundRefinePanel
                    messages={session.messages}
                    understanding={session.understanding}
                    loading={refineMut.isPending}
                    onSend={(text) => refineMut.mutate(text)}
                  />
                  <div className={styles.refineActions}>
                    <button
                      type="button"
                      className={shared.btnPrimary}
                      onClick={() => setOutlineViewOpen(true)}
                    >
                      {session.outline ? '继续编辑大纲' : '进入结构化大纲'}
                    </button>
                    {!session.outline ? (
                      <button
                        type="button"
                        className={styles.skipOutline}
                        onClick={() => setHandoffOpen(true)}
                      >
                        跳过大纲，直接交接
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </>
          ) : session.selectedTopic ? (
            <section className={styles.refineSection}>
              <h2 className={styles.sectionTitle}>结构化大纲</h2>
              <PlaygroundOutlinePanel
                selectedTopic={session.selectedTopic}
                outline={session.outline}
                messages={session.outlineMessages}
                generating={outlineGenerateMut.isPending}
                refining={outlineRefineMut.isPending}
                quotaBlocked={quotaBlocked}
                onGenerate={() => outlineGenerateMut.mutate()}
                onSend={(text) => outlineRefineMut.mutate(text)}
                onHandoff={() => setHandoffOpen(true)}
                onBackToTopics={() => setOutlineViewOpen(false)}
              />
            </section>
          ) : null}
        </>
      )}

      {topicsMut.isPending && session.topics.length === 0 ? (
        <LoadingBlock label="生成选题中…" />
      ) : null}

      {session.selectedTopic ? (
        <PlaygroundHandoffModal
          open={handoffOpen}
          title={session.selectedTopic.title}
          brief={brief}
          hooks={session.understanding ?? ''}
          understanding={session.understanding}
          outline={session.outline}
          pipelines={pipelines}
          selectedCount={
            session.selectedTopics.length > 0 ? session.selectedTopics.length : 1
          }
          remainingCompletedQuota={
            usage
              ? Math.max(0, usage.completed_projects_limit - usage.completed_projects)
              : null
          }
          onClose={() => setHandoffOpen(false)}
          onConfirm={(payload) => handoffMut.mutate(payload)}
          loading={handoffMut.isPending}
        />
      ) : null}
    </div>
  )
}

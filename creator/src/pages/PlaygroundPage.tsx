import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  fetchPipelines,
  playgroundHandoff,
  playgroundRefine,
  playgroundTopics,
} from '../api/creator'
import { LoadingBlock } from '../components/LoadingBlock'
import { PlaygroundHandoffModal } from '../components/PlaygroundHandoffModal'
import type { HandoffPayload } from '../components/PlaygroundHandoffModal'
import { PageHeader } from '../components/PageHeader'
import { PlaygroundRefinePanel } from '../components/PlaygroundRefinePanel'
import {
  PlaygroundTopicCards,
  PlaygroundTopicCardsActions,
} from '../components/PlaygroundTopicCards'
import { QuotaLimitNotice, quotaLimitKindFromCode } from '../components/QuotaLimitNotice'
import { usePlaygroundSession } from '../hooks/usePlaygroundSession'
import type { PlaygroundTopic } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './PlaygroundPage.module.css'

export function PlaygroundPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session, setSession, resetSession, exportSession } = usePlaygroundSession()
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [quotaError, setQuotaError] = useState<'ai' | 'projects' | 'playground' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: fetchPipelines,
  })

  const topicsMut = useMutation({
    mutationFn: () => playgroundTopics(),
    onSuccess: (data) => {
      setQuotaError(null)
      setActionError(null)
      setSession((prev) => ({
        ...prev,
        topics: data.topics,
        selectedTopic: null,
        messages: [],
        understanding: null,
        brandEmpty: data.brand_empty,
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
      setActionError(err instanceof Error ? err.message : 'Refine 失败，请重试')
    },
  })

  const handoffMut = useMutation({
    mutationFn: (payload: HandoffPayload) => playgroundHandoff(payload),
    onSuccess: (data) => {
      resetSession()
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/projects/${data.project_id}`)
    },
    onError: (err: unknown) => {
      setActionError(err instanceof Error ? err.message : '创建项目失败')
    },
  })

  function selectTopic(topic: PlaygroundTopic) {
    if (
      session.selectedTopic &&
      session.messages.length > 0 &&
      (session.selectedTopic.title !== topic.title ||
        session.selectedTopic.reason !== topic.reason)
    ) {
      const ok = window.confirm('切换选题将清空当前选题的 refine 对话，是否继续？')
      if (!ok) return
    }
    setSession((prev) => ({
      ...prev,
      selectedTopic: topic,
      messages: [],
      understanding: null,
    }))
  }

  const brief = session.understanding ?? session.selectedTopic?.reason ?? ''

  return (
    <div className={styles.page}>
      <PageHeader
        title="灵感实验室"
        description="完全不知道写什么？先生成选题清单，多轮 refine 后再进入流水线。"
      />

      <div className={styles.persistWarn} role="status">
        刷新页面可能丢失未导出的 Playground 会话。
        <button type="button" className={styles.linkBtn} onClick={exportSession}>
          导出会话 JSON
        </button>
      </div>

      {quotaError ? <QuotaLimitNotice kind={quotaError} /> : null}
      {actionError ? <p className={shared.error}>{actionError}</p> : null}

      {session.topics.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>不知道写什么？</h2>
          <p className={shared.muted}>
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

          <section>
            <h2 className={styles.sectionTitle}>选题清单</h2>
            <PlaygroundTopicCards
              topics={session.topics}
              selected={session.selectedTopic}
              onSelect={selectTopic}
            />
            <PlaygroundTopicCardsActions
              onRegenerate={() => topicsMut.mutate()}
              loading={topicsMut.isPending}
            />
          </section>

          {session.selectedTopic ? (
            <section className={styles.refineSection}>
              <h2 className={styles.sectionTitle}>Refine：{session.selectedTopic.title}</h2>
              <PlaygroundRefinePanel
                messages={session.messages}
                understanding={session.understanding}
                loading={refineMut.isPending}
                onSend={(text) => refineMut.mutate(text)}
              />
              <div className={shared.btnRow}>
                <button
                  type="button"
                  className={shared.btnPrimary}
                  onClick={() => setHandoffOpen(true)}
                >
                  进入流水线
                </button>
              </div>
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
          pipelines={pipelines}
          onClose={() => setHandoffOpen(false)}
          onConfirm={(payload) => handoffMut.mutate(payload)}
          loading={handoffMut.isPending}
        />
      ) : null}
    </div>
  )
}

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { playgroundTopics } from '../api/creator'
import { PlaygroundTopicCards } from './PlaygroundTopicCards'
import { QuotaLimitNotice } from './QuotaLimitNotice'
import type { PlaygroundTopic } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './TopicSeedPanel.module.css'

export function buildTopicDraft(title: string, reason: string): string {
  return `# ${title.trim()}\n\n${reason.trim()}`
}

interface TopicSeedPanelProps {
  onSelect: (topic: PlaygroundTopic, draft: string) => void
  onQuotaError: () => void
  onRegenerate: () => void
}

export function TopicSeedPanel({ onSelect, onQuotaError, onRegenerate }: TopicSeedPanelProps) {
  const [seed, setSeed] = useState('')
  const [topics, setTopics] = useState<PlaygroundTopic[]>([])
  const [selected, setSelected] = useState<PlaygroundTopic | null>(null)
  const [brandEmpty, setBrandEmpty] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const topicsMut = useMutation({
    mutationFn: () => playgroundTopics({ seed: seed.trim() }),
    onSuccess: (data) => {
      setActionError(null)
      setTopics(data.topics)
      setBrandEmpty(data.brand_empty)
      setSelected(null)
      onRegenerate()
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 40203) {
        onQuotaError()
        return
      }
      setActionError(err instanceof Error ? err.message : '生成失败')
    },
  })

  function handleSelect(topic: PlaygroundTopic) {
    setSelected(topic)
    onSelect(topic, buildTopicDraft(topic.title, topic.reason))
  }

  return (
    <div className={styles.panel}>
      <label className={shared.fieldLabel}>
        创作方向
        <textarea
          className={styles.textarea}
          placeholder="例如：职场通勤穿搭、面向新人的理财科普…"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </label>
      <p className={styles.quotaHint}>消耗 1 次 Playground 额度</p>
      {actionError && (
        <p className={shared.error} role="alert">
          {actionError}
        </p>
      )}
      {brandEmpty && topics.length > 0 && (
        <p className={styles.brandWarning}>
          尚未配置品牌档案，生成质量可能受限。
          <Link to="/brand"> 去完善品牌档案</Link>
        </p>
      )}
      <div className={shared.btnRow}>
        <button
          type="button"
          className={shared.btnSecondary}
          onClick={() => topicsMut.mutate()}
          disabled={!seed.trim() || topicsMut.isPending}
        >
          {topicsMut.isPending ? '生成中…' : '生成 3 个标题'}
        </button>
      </div>
      {topics.length > 0 && (
        <>
          <PlaygroundTopicCards topics={topics} selected={selected} onSelect={handleSelect} />
        </>
      )}
      {topicsMut.isError && topicsMut.error instanceof ApiError && topicsMut.error.code === 40203 && (
        <QuotaLimitNotice kind="playground" />
      )}
    </div>
  )
}

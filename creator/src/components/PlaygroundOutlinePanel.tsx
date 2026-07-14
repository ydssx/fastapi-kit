import { useState } from 'react'
import type { PlaygroundMessage, PlaygroundOutline, PlaygroundTopic } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './PlaygroundOutlinePanel.module.css'

interface PlaygroundOutlinePanelProps {
  selectedTopic: PlaygroundTopic
  outline: PlaygroundOutline | null
  messages: PlaygroundMessage[]
  generating: boolean
  refining: boolean
  quotaBlocked: boolean
  onGenerate: () => void
  onSend: (text: string) => void
  onHandoff: () => void
  onBackToTopics: () => void
}

export function PlaygroundOutlinePanel({
  selectedTopic,
  outline,
  messages,
  generating,
  refining,
  quotaBlocked,
  onGenerate,
  onSend,
  onHandoff,
  onBackToTopics,
}: PlaygroundOutlinePanelProps) {
  const [input, setInput] = useState('')
  const loading = generating || refining

  function submit() {
    const text = input.trim()
    if (!text || loading || quotaBlocked || !outline) return
    onSend(text)
    setInput('')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.topicChip}>
        <strong>{selectedTopic.title}</strong>
        <span>{selectedTopic.reason}</span>
      </div>

      {!outline ? (
        <>
          <p className={styles.emptyHint}>
            将当前选题扩展为结构化大纲：核心主张、开头钩子、3–5 个段落要点、结尾 CTA。
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={shared.btnPrimary}
              onClick={onGenerate}
              disabled={generating || quotaBlocked}
            >
              {generating ? '生成中…' : '生成结构化大纲'}
            </button>
            <button type="button" className={shared.btnGhost} onClick={onBackToTopics}>
              返回选题探索
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.outlineCard}>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>核心主张</p>
              <p className={styles.fieldBody}>{outline.central_claim}</p>
            </div>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>开头钩子</p>
              <p className={styles.fieldBody}>{outline.opening_hook}</p>
            </div>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>段落要点</p>
              <ol className={styles.sectionList}>
                {outline.sections.map((section) => (
                  <li key={section.title}>
                    <strong>{section.title}</strong> — {section.summary}
                  </li>
                ))}
              </ol>
            </div>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>结尾 CTA</p>
              <p className={styles.fieldBody}>{outline.closing_cta}</p>
            </div>
          </div>

          <div className={styles.messages} aria-live="polite">
            {messages.length === 0 ? (
              <p className={shared.muted}>对大纲不满意？在这里多轮优化想法，直到可以交接到项目。</p>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={msg.role === 'user' ? styles.userMsg : styles.assistantMsg}
                >
                  <span className={styles.role}>{msg.role === 'user' ? '你' : '助手'}</span>
                  <p>{msg.content}</p>
                </div>
              ))
            )}
          </div>

          <div className={styles.composer}>
            <textarea
              className={styles.input}
              rows={3}
              value={input}
              placeholder="例如：钩子再犀利一点、第三段改成案例导向…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              disabled={quotaBlocked}
            />
            <div className={styles.actions}>
              <button
                type="button"
                className={shared.btnPrimary}
                onClick={submit}
                disabled={loading || quotaBlocked}
              >
                {refining ? '调整中…' : '调整大纲'}
              </button>
              <button type="button" className={shared.btnGhost} onClick={onBackToTopics}>
                返回选题探索
              </button>
              <button type="button" className={shared.btnPrimary} onClick={onHandoff}>
                交接到项目
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import type { PlaygroundMessage } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './PlaygroundRefinePanel.module.css'

interface PlaygroundRefinePanelProps {
  messages: PlaygroundMessage[]
  understanding: string | null
  loading: boolean
  onSend: (text: string) => void
}

export function PlaygroundRefinePanel({
  messages,
  understanding,
  loading,
  onSend,
}: PlaygroundRefinePanelProps) {
  const [input, setInput] = useState('')

  function submit() {
    const text = input.trim()
    if (!text || loading) return
    onSend(text)
    setInput('')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.messages} aria-live="polite">
        {messages.length === 0 ? (
          <p className={shared.muted}>选中选题后，在这里多轮优化想法，满意后再交接到项目。</p>
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
      {understanding ? (
        <div className={styles.understanding}>
          <strong>当前理解</strong>
          <p>{understanding}</p>
        </div>
      ) : null}
      <div className={styles.composer}>
        <textarea
          className={styles.input}
          rows={3}
          value={input}
          placeholder="例如：更聚焦职场新人、再窄一点…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button type="button" className={shared.btnPrimary} onClick={submit} disabled={loading}>
          {loading ? '生成中…' : '发送'}
        </button>
      </div>
    </div>
  )
}

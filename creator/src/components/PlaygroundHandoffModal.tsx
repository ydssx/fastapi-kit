import { useEffect, useMemo, useState } from 'react'
import type { Pipeline } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './PlaygroundHandoffModal.module.css'

const LAST_PIPELINE_KEY = 'creator-last-pipeline'

export interface HandoffPayload {
  pipeline_id: string
  title: string
  brief: string
  hooks: string
  raw_notes: string
}

interface PlaygroundHandoffModalProps {
  open: boolean
  title: string
  brief: string
  hooks: string
  understanding: string | null
  pipelines: Pipeline[]
  onClose: () => void
  onConfirm: (payload: HandoffPayload) => void
  loading: boolean
}

export function PlaygroundHandoffModal({
  open,
  title,
  brief,
  hooks,
  understanding,
  pipelines,
  onClose,
  onConfirm,
  loading,
}: PlaygroundHandoffModalProps) {
  const [pipelineId, setPipelineId] = useState('')
  const [editableBrief, setEditableBrief] = useState(brief)
  const [editableHooks, setEditableHooks] = useState(hooks)

  useEffect(() => {
    if (!open) return
    setEditableBrief(brief)
    setEditableHooks(hooks)
    const last = localStorage.getItem(LAST_PIPELINE_KEY)
    if (last && pipelines.some((p) => p.id === last)) {
      setPipelineId(last)
    } else {
      setPipelineId('')
    }
  }, [open, brief, hooks, pipelines])

  const preview = useMemo(() => {
    const topic = `# ${title}\n\n${editableBrief}`
    const hookLine = editableHooks.trim()
      ? `\n\n→ hook/outline 步: ${editableHooks.trim().slice(0, 120)}…`
      : ''
    const note = understanding ? `\n\n（理解: ${understanding}）` : ''
    return `${topic}${note}${hookLine}`
  }, [title, editableBrief, editableHooks, understanding])

  if (!open) return null

  function confirm() {
    if (!pipelineId) return
    localStorage.setItem(LAST_PIPELINE_KEY, pipelineId)
    onConfirm({
      pipeline_id: pipelineId,
      title,
      brief: editableBrief,
      hooks: editableHooks,
      raw_notes: understanding ?? '',
    })
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="handoff-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="handoff-title">进入流水线</h2>
        <p className={shared.muted}>选择流水线并确认将注入项目的草稿内容。</p>

        <label className={styles.label}>
          流水线
          <select
            className={styles.select}
            value={pipelineId}
            onChange={(e) => setPipelineId(e.target.value)}
          >
            <option value="">请选择…</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          选题说明（可编辑）
          <textarea
            className={styles.textarea}
            rows={4}
            value={editableBrief}
            onChange={(e) => setEditableBrief(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          钩子/角度（可编辑，可选）
          <textarea
            className={styles.textarea}
            rows={3}
            value={editableHooks}
            onChange={(e) => setEditableHooks(e.target.value)}
          />
        </label>

        <div className={styles.preview}>
          <strong>映射预览</strong>
          <pre>{preview}</pre>
        </div>

        <div className={shared.btnRow}>
          <button type="button" className={shared.btnGhost} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={shared.btnPrimary}
            onClick={confirm}
            disabled={!pipelineId || !editableBrief.trim() || loading}
          >
            {loading ? '创建中…' : '创建并进入项目'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function getLastPipelineId(): string | null {
  return localStorage.getItem(LAST_PIPELINE_KEY)
}

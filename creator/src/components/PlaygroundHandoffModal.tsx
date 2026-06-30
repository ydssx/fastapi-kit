import { useEffect, useMemo, useState } from 'react'
import type { Pipeline, PlaygroundOutline } from '../types/api'
import {
  formatOutlineMarkdown,
  outlineHandoffStepKey,
  outlineHandoffStepLabel,
} from '../utils/playgroundOutline'
import shared from '../styles/shared.module.css'
import { PlatformPicker } from './PlatformPicker'
import styles from './PlaygroundHandoffModal.module.css'

const LAST_PIPELINE_KEY = 'creator-last-pipeline'

const PLATFORMS = [
  { key: 'douyin', label: '抖音', emoji: '🎵' },
  { key: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { key: 'wechat', label: '公众号', emoji: '💬' },
  { key: 'bilibili', label: 'B站', emoji: '📺' },
]

export interface HandoffPayload {
  pipeline_id: string
  title: string
  brief: string
  hooks?: string
  outline?: PlaygroundOutline
  raw_notes?: string
  target_platform_keys: string[]
  primary_platform_key: string | null
}

interface PlaygroundHandoffModalProps {
  open: boolean
  title: string
  brief: string
  hooks: string
  understanding: string | null
  outline: PlaygroundOutline | null
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
  outline,
  pipelines,
  onClose,
  onConfirm,
  loading,
}: PlaygroundHandoffModalProps) {
  const [pipelineId, setPipelineId] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['xiaohongshu'])
  const [primaryPlatform, setPrimaryPlatform] = useState('xiaohongshu')
  const [editableBrief, setEditableBrief] = useState(brief)
  const [editableHooks, setEditableHooks] = useState(hooks)
  const [editableOutlineText, setEditableOutlineText] = useState('')

  useEffect(() => {
    if (!open) return
    setEditableBrief(brief)
    setEditableHooks(hooks)
    setEditableOutlineText(outline ? formatOutlineMarkdown(outline) : '')
    setPlatforms(['xiaohongshu'])
    setPrimaryPlatform('xiaohongshu')
    const last = localStorage.getItem(LAST_PIPELINE_KEY)
    if (last && pipelines.some((p) => p.id === last)) {
      setPipelineId(last)
    } else {
      setPipelineId('')
    }
  }, [open, brief, hooks, outline, pipelines])

  function handlePlatformsChange(next: string[]) {
    setPlatforms(next)
    if (next.length === 1) {
      setPrimaryPlatform(next[0]!)
    } else if (primaryPlatform && !next.includes(primaryPlatform)) {
      setPrimaryPlatform('')
    }
  }

  const primaryReady = platforms.length <= 1 || primaryPlatform.length > 0
  const hasOutlinePayload = Boolean(outline)
  const canConfirm =
    Boolean(pipelineId) &&
    Boolean(editableBrief.trim()) &&
    platforms.length > 0 &&
    primaryReady &&
    (!hasOutlinePayload || Boolean(editableOutlineText.trim()))

  const preview = useMemo(() => {
    const topicBlock = `→ topic 步\n# ${title}\n\n${editableBrief}`
    const outlineStep = pipelineId
      ? outlineHandoffStepLabel(pipelineId)
      : 'hook / outline 步'
    const outlineBlock = hasOutlinePayload
      ? `\n\n→ ${outlineStep}\n${editableOutlineText.trim().slice(0, 280)}${
          editableOutlineText.trim().length > 280 ? '…' : ''
        }`
      : editableHooks.trim()
        ? `\n\n→ ${outlineStep}\n${editableHooks.trim().slice(0, 280)}${
            editableHooks.trim().length > 280 ? '…' : ''
          }`
        : ''
    const note = understanding ? `\n\n（理解: ${understanding}）` : ''
    return `${topicBlock}${note}${outlineBlock}`
  }, [
    title,
    editableBrief,
    editableHooks,
    editableOutlineText,
    understanding,
    pipelineId,
    hasOutlinePayload,
  ])

  if (!open) return null

  function confirm() {
    if (!canConfirm) return
    localStorage.setItem(LAST_PIPELINE_KEY, pipelineId)
    const payload: HandoffPayload = {
      pipeline_id: pipelineId,
      title,
      brief: editableBrief,
      raw_notes: understanding ?? '',
      target_platform_keys: platforms,
      primary_platform_key: platforms.length === 1 ? platforms[0]! : primaryPlatform || null,
    }
    if (outline) {
      payload.outline = outline
      const defaultText = formatOutlineMarkdown(outline)
      if (editableOutlineText.trim() !== defaultText) {
        payload.hooks = editableOutlineText.trim()
      }
    } else if (editableHooks.trim()) {
      payload.hooks = editableHooks
    }
    onConfirm(payload)
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
        <p className={shared.muted}>
          选择流水线并确认将注入项目的草稿内容。结构化大纲会写入 topic 摘要与对应早期步骤。
        </p>

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

        <PlatformPicker
          options={PLATFORMS}
          value={platforms}
          onChange={handlePlatformsChange}
          legend="目标平台"
          showPrimary
          primaryKey={primaryPlatform || null}
          onPrimaryChange={setPrimaryPlatform}
        />

        <label className={styles.label}>
          选题说明 → topic 步（可编辑）
          <textarea
            className={styles.textarea}
            rows={4}
            value={editableBrief}
            onChange={(e) => setEditableBrief(e.target.value)}
          />
        </label>

        {hasOutlinePayload ? (
          <label className={styles.label}>
            结构化大纲 → {pipelineId ? outlineHandoffStepKey(pipelineId) : 'hook/outline'} 步（可编辑）
            <textarea
              className={styles.textarea}
              rows={8}
              value={editableOutlineText}
              onChange={(e) => setEditableOutlineText(e.target.value)}
            />
          </label>
        ) : (
          <label className={styles.label}>
            钩子/角度 → hook/outline 步（可编辑，可选）
            <textarea
              className={styles.textarea}
              rows={3}
              value={editableHooks}
              onChange={(e) => setEditableHooks(e.target.value)}
            />
          </label>
        )}

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
            disabled={!canConfirm || loading}
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

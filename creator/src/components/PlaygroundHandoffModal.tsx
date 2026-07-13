import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Pipeline, PlaygroundOutline } from '../types/api'
import {
  formatOutlineMarkdown,
  outlineHandoffStepKey,
  outlineHandoffStepLabel,
} from '../utils/playgroundOutline'
import { CREATOR_PLATFORMS } from '../lib/platforms'
import shared from '../styles/shared.module.css'
import { PlatformPicker } from './PlatformPicker'
import styles from './PlaygroundHandoffModal.module.css'

const LAST_PIPELINE_KEY = 'creator-last-pipeline'
const DEFAULT_PIPELINE_ID = 'long_article'

export type MixedHandoffMode = 'current' | 'all'

export interface HandoffPayload {
  pipeline_id: string
  title: string
  brief: string
  hooks?: string
  outline?: PlaygroundOutline
  raw_notes?: string
  target_platform_keys: string[]
  primary_platform_key: string | null
  mode: MixedHandoffMode
}

interface PlaygroundHandoffModalProps {
  open: boolean
  title: string
  brief: string
  hooks: string
  understanding: string | null
  outline: PlaygroundOutline | null
  pipelines: Pipeline[]
  selectedCount: number
  remainingCompletedQuota: number | null
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
  selectedCount,
  remainingCompletedQuota,
  onClose,
  onConfirm,
  loading,
}: PlaygroundHandoffModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [pipelineId, setPipelineId] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['xiaohongshu'])
  const [primaryPlatform, setPrimaryPlatform] = useState('xiaohongshu')
  const [editableBrief, setEditableBrief] = useState(brief)
  const [editableHooks, setEditableHooks] = useState(hooks)
  const [editableOutlineText, setEditableOutlineText] = useState('')
  const [mode, setMode] = useState<MixedHandoffMode>('current')
  const [quotaAck, setQuotaAck] = useState(false)

  const multiSelect = selectedCount > 1

  useEffect(() => {
    if (!open) return
    setEditableBrief(brief)
    setEditableHooks(hooks)
    setEditableOutlineText(outline ? formatOutlineMarkdown(outline) : '')
    setPlatforms(['xiaohongshu'])
    setPrimaryPlatform('xiaohongshu')
    setMode('current')
    setQuotaAck(false)
    const last = localStorage.getItem(LAST_PIPELINE_KEY)
    if (last && pipelines.some((p) => p.id === last)) {
      setPipelineId(last)
    } else if (pipelines.some((p) => p.id === DEFAULT_PIPELINE_ID)) {
      setPipelineId(DEFAULT_PIPELINE_ID)
    } else {
      setPipelineId(pipelines[0]?.id ?? '')
    }
  }, [open, brief, hooks, outline, pipelines])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [open, onClose])

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
  const needsQuotaWarning =
    mode === 'all' &&
    remainingCompletedQuota != null &&
    selectedCount > remainingCompletedQuota
  const canConfirm =
    Boolean(pipelineId) &&
    Boolean(editableBrief.trim()) &&
    platforms.length > 0 &&
    primaryReady &&
    (!hasOutlinePayload || Boolean(editableOutlineText.trim())) &&
    (!needsQuotaWarning || quotaAck)

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
      mode: multiSelect ? mode : 'current',
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

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    )
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (event.shiftKey && (document.activeElement === event.currentTarget || document.activeElement === first)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const confirmLabel =
    loading
      ? '创建中…'
      : multiSelect && mode === 'all'
        ? `创建 ${selectedCount} 个项目`
        : '创建并进入项目'

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="handoff-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <h2 id="handoff-title">交接到项目</h2>
        <p className={shared.muted}>
          确认将主题、目标平台和大纲交接到新项目。创建后可在项目中继续编辑。
        </p>

        {multiSelect ? (
          <fieldset className={styles.modeFieldset}>
            <legend className={styles.modeLegend}>混合交接</legend>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="mixed-handoff-mode"
                checked={mode === 'current'}
                onChange={() => {
                  setMode('current')
                  setQuotaAck(false)
                }}
              />
              <span>
                只建当前这条，其余 {selectedCount - 1} 条留在本会话
              </span>
            </label>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="mixed-handoff-mode"
                checked={mode === 'all'}
                onChange={() => setMode('all')}
              />
              <span>立刻把勾选的 {selectedCount} 条都建成项目</span>
            </label>
          </fieldset>
        ) : null}

        {needsQuotaWarning ? (
          <label className={styles.quotaWarn}>
            <input
              type="checkbox"
              checked={quotaAck}
              onChange={(e) => setQuotaAck(e.target.checked)}
            />
            <span>
              本月还可完成 {remainingCompletedQuota} 个项目，一次创建 {selectedCount}{' '}
              个草稿后，完成时可能触达免费额度。我已知晓并继续。
            </span>
          </label>
        ) : null}

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
          options={CREATOR_PLATFORMS}
          value={platforms}
          onChange={handlePlatformsChange}
          legend="目标平台"
          showPrimary
          primaryKey={primaryPlatform || null}
          onPrimaryChange={setPrimaryPlatform}
        />

        <label className={styles.label}>
          选题说明 → topic 步（可编辑）
          {mode === 'all' && multiSelect ? (
            <span className={shared.muted}>（全建时仅当前焦点选题带此说明/大纲；其余用各自标题与理由）</span>
          ) : null}
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
          <strong>将写入项目{mode === 'all' && multiSelect ? '（当前焦点）' : ''}</strong>
          <pre>{preview}</pre>
        </div>

        <div className={shared.btnRow}>
          <button type="button" className={shared.btnGhost} onClick={onClose} disabled={loading}>
            取消
          </button>
          <button
            type="button"
            className={shared.btnPrimary}
            onClick={confirm}
            disabled={!canConfirm || loading}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function getLastPipelineId(): string | null {
  return localStorage.getItem(LAST_PIPELINE_KEY)
}

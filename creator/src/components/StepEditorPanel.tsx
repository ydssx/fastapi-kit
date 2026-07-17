import { useRef, type ReactNode, type RefObject } from 'react'
import shared from '../styles/shared.module.css'
import styles from './StepEditorPanel.module.css'

export type DraftSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export type EditorLockReason = 'ai-generating' | 'rewrite-preview'

export interface StepEditorToolbarContext {
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

interface StepEditorPanelProps {
  title: string
  decisionHint?: string
  content: string
  onContentChange: (value: string) => void
  onSelectionChange: (selectionStart: number, selectionEnd: number) => void
  onSaveDraft: () => void
  onConfirm: () => void
  savingDraft: boolean
  confirming: boolean
  draftStatus?: DraftSaveStatus
  editorDisabled?: boolean
  lockReason?: EditorLockReason
  onPickImage?: () => void
  addingImage?: boolean
  selectionToolbar?: ReactNode | ((ctx: StepEditorToolbarContext) => ReactNode)
}

function lockNoteLabel(reason: EditorLockReason | undefined): string {
  if (reason === 'ai-generating') return 'AI 生成中，稿面已锁定'
  return '预览确认中，稿面已锁定'
}

const CHAR_LIMIT = 2000
const CHAR_WARN_AT = 1800

function draftStatusLabel(status: DraftSaveStatus): string | null {
  switch (status) {
    case 'saving':
      return '保存中…'
    case 'saved':
      return '已保存'
    case 'dirty':
      return '未保存更改'
    case 'error':
      return '自动保存失败'
    default:
      return null
  }
}

export function StepEditorPanel({
  title,
  decisionHint,
  content,
  onContentChange,
  onSelectionChange,
  onSaveDraft,
  onConfirm,
  savingDraft,
  confirming,
  draftStatus = 'idle',
  editorDisabled = false,
  lockReason,
  onPickImage,
  addingImage = false,
  selectionToolbar,
}: StepEditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const statusLabel = draftStatusLabel(draftStatus)
  const nearLimit = content.length >= CHAR_WARN_AT
  const atLimit = content.length >= CHAR_LIMIT
  const toolbar =
    typeof selectionToolbar === 'function'
      ? selectionToolbar({ textareaRef })
      : selectionToolbar

  return (
    <section className={`${shared.panel} ${shared.panelStage} ${styles.panel}`}>
      <header className={styles.head}>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>当前步骤</p>
          <h2 className={styles.title}>{title}</h2>
        </div>
        {statusLabel && (
          <span
            className={`${styles.draftStatus} ${
              draftStatus === 'error' ? styles.draftError : ''
            } ${draftStatus === 'saved' ? styles.draftSaved : ''} ${
              draftStatus === 'dirty' ? styles.draftDirty : ''
            }`}
            role="status"
          >
            <span className={styles.statusDot} aria-hidden />
            {statusLabel}
          </span>
        )}
      </header>

      {decisionHint && (
        <p className={styles.hint}>
          <span className={styles.hintLabel}>本步决定</span>
          <span className={styles.decision}>{decisionHint}</span>
        </p>
      )}

      <div
        className={`${styles.editorWrap} ${editorDisabled ? styles.editorLocked : ''}`}
        data-locked={editorDisabled ? 'true' : undefined}
      >
        <textarea
          ref={textareaRef}
          className={`${shared.textarea} ${styles.manuscript}`}
          rows={12}
          value={content}
          onChange={(e) => {
            onContentChange(e.target.value)
            onSelectionChange(e.target.selectionStart, e.target.selectionEnd)
          }}
          onSelect={(e) =>
            onSelectionChange(e.currentTarget.selectionStart, e.currentTarget.selectionEnd)
          }
          placeholder={`撰写「${title}」…`}
          disabled={editorDisabled}
          maxLength={CHAR_LIMIT}
          aria-describedby="step-editor-meta"
        />
        <div className={styles.metaRow} id="step-editor-meta">
          {editorDisabled ? (
            <span className={styles.lockNote} role="status">
              {lockNoteLabel(lockReason)}
            </span>
          ) : (
            <span className={styles.metaHint}>划选文字可改这段</span>
          )}
          <span
            className={`${styles.charCount} ${nearLimit ? styles.charWarn : ''} ${
              atLimit ? styles.charLimit : ''
            }`}
          >
            {content.length}
            <span className={styles.charSep}>/</span>
            {CHAR_LIMIT}
          </span>
        </div>
      </div>
      {toolbar}

      {onPickImage && (
        <button
          type="button"
          className={styles.assetButton}
          onClick={onPickImage}
          disabled={editorDisabled || addingImage}
        >
          {addingImage ? '正在添加图片…' : '从素材库添加图片'}
        </button>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={shared.btnGhost}
          onClick={onSaveDraft}
          disabled={savingDraft || editorDisabled || draftStatus === 'saved' || draftStatus === 'idle'}
        >
          {savingDraft ? '保存中…' : '保存草稿'}
        </button>
        <button
          type="button"
          className={shared.btnPrimary}
          onClick={onConfirm}
          disabled={confirming || editorDisabled || !content.trim()}
        >
          {confirming ? '确认中…' : '确认并进入下一步'}
        </button>
      </div>
    </section>
  )
}

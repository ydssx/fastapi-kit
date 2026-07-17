import type { ReactNode } from 'react'
import shared from '../styles/shared.module.css'
import styles from './StepEditorPanel.module.css'

export type DraftSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

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
  onPickImage?: () => void
  addingImage?: boolean
  selectionToolbar?: ReactNode
}

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
  onPickImage,
  addingImage = false,
  selectionToolbar,
}: StepEditorPanelProps) {
  const statusLabel = draftStatusLabel(draftStatus)

  return (
    <section className={`${shared.panel} ${shared.panelStage} ${styles.panel}`}>
      <div className={styles.head}>
        <h2 className={shared.panelTitle}>{title}</h2>
        {statusLabel && (
          <span
            className={`${styles.draftStatus} ${
              draftStatus === 'error' ? styles.draftError : ''
            } ${draftStatus === 'saved' ? styles.draftSaved : ''}`}
            role="status"
          >
            {statusLabel}
          </span>
        )}
      </div>
      {decisionHint && (
        <p className={styles.hint}>
          本步你要决定：<span className={styles.decision}>{decisionHint}</span>
        </p>
      )}
      <div className={styles.editorWrap}>
        <textarea
          className={shared.textarea}
          rows={12}
          value={content}
          onChange={(e) => {
            onContentChange(e.target.value)
            onSelectionChange(e.target.selectionStart, e.target.selectionEnd)
          }}
          onSelect={(e) => onSelectionChange(e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
          placeholder={`撰写「${title}」…`}
          disabled={editorDisabled}
          maxLength={2000}
        />
        <span className={styles.charCount}>{content.length} / 2000</span>
        {selectionToolbar}
      </div>
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

import shared from '../styles/shared.module.css'
import styles from './StepEditorPanel.module.css'

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
  editorDisabled?: boolean
  onPickImage?: () => void
  addingImage?: boolean
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
  editorDisabled = false,
  onPickImage,
  addingImage = false,
}: StepEditorPanelProps) {
  return (
    <section className={shared.panel}>
      <h2 className={shared.panelTitle}>{title}</h2>
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
      <div className={shared.btnRow}>
        <button
          type="button"
          className={shared.btnGhost}
          onClick={onSaveDraft}
          disabled={savingDraft || editorDisabled}
        >
          {savingDraft ? '保存中…' : '暂存草稿'}
        </button>
        <button
          type="button"
          className={shared.btnPrimary}
          onClick={onConfirm}
          disabled={confirming || editorDisabled || !content.trim()}
        >
          {confirming ? '确认中…' : '确认并下一步 →'}
        </button>
      </div>
    </section>
  )
}

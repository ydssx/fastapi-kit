import shared from '../styles/shared.module.css'
import styles from './StepEditorPanel.module.css'

interface StepEditorPanelProps {
  title: string
  description?: string
  content: string
  onContentChange: (value: string) => void
  aiEnabled: boolean
  onSaveDraft: () => void
  onAiSuggest: () => void
  onConfirm: () => void
  savingDraft: boolean
  aiPending: boolean
  confirming: boolean
}

export function StepEditorPanel({
  title,
  description,
  content,
  onContentChange,
  aiEnabled,
  onSaveDraft,
  onAiSuggest,
  onConfirm,
  savingDraft,
  aiPending,
  confirming,
}: StepEditorPanelProps) {
  return (
    <section className={shared.panel}>
      <h2 className={shared.panelTitle}>{title}</h2>
      {description && <p className={styles.hint}>{description}</p>}
      <div className={styles.editorWrap}>
        <textarea
          className={shared.textarea}
          rows={12}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={`撰写「${title}」…`}
          disabled={aiPending}
          maxLength={2000}
        />
        <span className={styles.charCount}>
          {content.length} / 2000
        </span>
      </div>
      <div className={shared.btnRow}>
        <button
          type="button"
          className={shared.btnGhost}
          onClick={onSaveDraft}
          disabled={savingDraft || aiPending}
        >
          {savingDraft ? '保存中…' : '暂存草稿'}
        </button>
        {aiEnabled && (
          <button
            type="button"
            className={shared.btn}
            onClick={onAiSuggest}
            disabled={aiPending || confirming}
          >
            {aiPending ? 'AI 生成中…' : 'AI 建议'}
          </button>
        )}
        <button
          type="button"
          className={shared.btnPrimary}
          onClick={onConfirm}
          disabled={confirming || aiPending || !content.trim()}
        >
          {confirming ? '确认中…' : '确认并下一步 →'}
        </button>
      </div>
    </section>
  )
}

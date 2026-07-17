import shared from '../styles/shared.module.css'
import styles from './SelectionRewriteFloat.module.css'

interface SelectionRewriteFloatProps {
  chips: { label: string; adjustment: string }[]
  loading: boolean
  preview: string | null
  locked: boolean
  onRewrite: (adjustment: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function SelectionRewriteFloat({
  chips,
  loading,
  preview,
  locked,
  onRewrite,
  onConfirm,
  onCancel,
}: SelectionRewriteFloatProps) {
  return (
    <div className={styles.root} role="region" aria-label="选区改写">
      {preview === null ? (
        <div className={styles.bar}>
          <span className={styles.label}>{loading ? '改写中…' : '改这段'}</span>
          <div className={styles.chips}>
            {chips.map((chip) => (
              <button
                key={chip.adjustment}
                type="button"
                className={styles.chip}
                disabled={loading || locked}
                onClick={() => onRewrite(chip.adjustment)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.preview}>
          <p className={styles.previewLabel}>预览改写（确认后才写入）</p>
          <pre className={styles.previewBody}>{preview}</pre>
          <div className={styles.previewActions}>
            <button type="button" className={shared.btnGhost} onClick={onCancel}>
              取消
            </button>
            <button type="button" className={shared.btnPrimary} onClick={onConfirm}>
              确认替换选区
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

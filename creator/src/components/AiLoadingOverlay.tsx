import { createPortal } from 'react-dom'
import { LoadingBlock } from './LoadingBlock'
import styles from './AiLoadingOverlay.module.css'

interface AiLoadingOverlayProps {
  active: boolean
  label?: string
}

export function AiLoadingOverlay({ active, label = 'AI 正在生成建议…' }: AiLoadingOverlayProps) {
  if (!active) return null

  return createPortal(
    <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.panel}>
        <LoadingBlock label={label} />
      </div>
    </div>,
    document.body,
  )
}

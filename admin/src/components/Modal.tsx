import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

type ModalProps = {
  title: string
  titleId?: string
  onClose: () => void
  headerActions?: ReactNode
  children: ReactNode
  wide?: boolean
}

export function Modal({
  title,
  titleId = 'modal-title',
  onClose,
  headerActions,
  children,
  wide = false,
}: ModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={`${styles.panel} ${wide ? styles.panelWide : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <div className={styles.headerActions}>
            {headerActions}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

import { Modal } from './Modal'
import { ModalFooter } from './ModalFooter'
import shared from '../styles/shared.module.css'
import styles from './ConfirmModal.module.css'

export type ConfirmVariant = 'default' | 'danger'

export type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

type ConfirmModalProps = ConfirmOptions & {
  titleId?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  titleId = 'confirm-modal-title',
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal title={title} titleId={titleId} onClose={onCancel}>
      <p className={styles.message}>{message}</p>
      <ModalFooter>
        <button type="button" className={shared.btnSecondary} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={variant === 'danger' ? shared.btnDanger : shared.btnPrimary}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  )
}

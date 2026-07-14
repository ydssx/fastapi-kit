import { useState } from 'react'
import { ConfirmModal } from './ConfirmModal'
import { CopyTextButton } from './CopyTextButton'
import { Modal } from './Modal'
import { ModalFooter } from './ModalFooter'
import codeBlock from '../styles/codeBlock.module.css'
import shared from '../styles/shared.module.css'
import styles from './PasswordResetResultModal.module.css'

type PasswordResetResultModalProps = {
  email: string
  temporaryPassword: string
  onClose: () => void
}

export function PasswordResetResultModal({
  email,
  temporaryPassword,
  onClose,
}: PasswordResetResultModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)

  function handleClose() {
    if (!acknowledged) {
      setCloseConfirmOpen(true)
      return
    }
    onClose()
  }

  return (
    <Modal
      title="临时密码已生成"
      titleId="password-reset-result-title"
      onClose={handleClose}
    >
      <p className={shared.notice} role="status">
        为 <strong>{email}</strong> 生成了新临时密码。旧密码已立即失效，此密码仅显示一次，请复制后通过安全渠道告知用户。
      </p>

      <div className={styles.passwordBlock}>
        <div className={styles.passwordHeader}>
          <span className={styles.passwordLabel}>临时密码</span>
          <CopyTextButton value={temporaryPassword} label="复制密码" />
        </div>
        <pre className={codeBlock.block} aria-label="临时密码">
          {temporaryPassword}
        </pre>
      </div>

      <label className={styles.ack}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        我已复制并安全保存临时密码
      </label>

      <ModalFooter>
        <button type="button" className={shared.btnPrimary} onClick={handleClose}>
          关闭
        </button>
      </ModalFooter>

      {closeConfirmOpen ? (
        <ConfirmModal
          title="确认关闭"
          titleId="password-reset-close-confirm-title"
          message="关闭后无法再次查看临时密码。确定已安全保存？"
          confirmLabel="仍然关闭"
          cancelLabel="返回"
          variant="danger"
          onConfirm={() => {
            setCloseConfirmOpen(false)
            onClose()
          }}
          onCancel={() => setCloseConfirmOpen(false)}
        />
      ) : null}
    </Modal>
  )
}

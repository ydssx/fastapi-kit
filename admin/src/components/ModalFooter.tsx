import type { ReactNode } from 'react'
import shared from '../styles/shared.module.css'

type ModalFooterProps = {
  children: ReactNode
}

export function ModalFooter({ children }: ModalFooterProps) {
  return <div className={shared.modalActions}>{children}</div>
}

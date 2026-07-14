import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConfirmDialog,
  type ConfirmOptions,
} from '../components/ConfirmDialog'

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void
}

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const pendingRef = useRef<PendingConfirm | null>(null)

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  useEffect(() => {
    return () => {
      pendingRef.current?.resolve(false)
    }
  }, [])

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ ...options, resolve })
    })
  }, [])

  const dialog = pending ? (
    <ConfirmDialog
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      variant={pending.variant}
      onConfirm={() => {
        pending.resolve(true)
        setPending(null)
      }}
      onCancel={() => {
        pending.resolve(false)
        setPending(null)
      }}
    />
  ) : null

  return { confirm, dialog }
}

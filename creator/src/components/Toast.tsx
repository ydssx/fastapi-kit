import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './Toast.module.css'

type ToastItem = {
  id: number
  message: string
}

type ToastContextValue = {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_MS = 2800

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string) => {
      const trimmed = message.trim()
      if (!trimmed) return
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev.slice(-3), { id, message: trimmed }])
      const timer = window.setTimeout(() => dismiss(id), TOAST_MS)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className={styles.host} aria-live="polite" aria-relevant="additions">
          {items.map((item) => (
            <div key={item.id} className={styles.toast} role="status">
              {item.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? { showToast: () => undefined }
}

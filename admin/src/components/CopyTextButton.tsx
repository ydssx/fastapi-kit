import { useEffect, useRef, useState } from 'react'
import styles from './CopyJsonButton.module.css'

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

type CopyTextButtonProps = {
  value: string
  label?: string
}

export function CopyTextButton({ value, label = '复制' }: CopyTextButtonProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyResetTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current)
      }
    }
  }, [])

  async function copy() {
    if (copyResetTimer.current !== null) {
      window.clearTimeout(copyResetTimer.current)
    }
    try {
      await navigator.clipboard.writeText(value)
      setCopyState('copied')
      copyResetTimer.current = window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('failed')
      copyResetTimer.current = window.setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  const stateLabel =
    copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : label

  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${copyState === 'copied' ? styles.iconBtnSuccess : ''} ${copyState === 'failed' ? styles.iconBtnError : ''}`}
      onClick={() => void copy()}
      aria-label={stateLabel}
      title={stateLabel}
    >
      {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

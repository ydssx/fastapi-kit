import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from './icons/CopyIcons'
import styles from './CopyJsonButton.module.css'

type CopyJsonButtonProps = {
  value: unknown
}

export function CopyJsonButton({ value }: CopyJsonButtonProps) {
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
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
      setCopyState('copied')
      copyResetTimer.current = window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('failed')
      copyResetTimer.current = window.setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  const label =
    copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制 JSON'

  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${copyState === 'copied' ? styles.iconBtnSuccess : ''} ${copyState === 'failed' ? styles.iconBtnError : ''}`}
      onClick={() => void copy()}
      aria-label={label}
      title={label}
    >
      {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

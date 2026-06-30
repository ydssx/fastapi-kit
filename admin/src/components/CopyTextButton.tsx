import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from './icons/CopyIcons'
import styles from './CopyJsonButton.module.css'

type CopyTextButtonProps = {
  value: string
  label?: string
  /** 表格行内等紧凑场景：无边框、更小尺寸 */
  compact?: boolean
}

export function CopyTextButton({ value, label = '复制', compact = false }: CopyTextButtonProps) {
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
      className={`${styles.iconBtn} ${compact ? styles.iconBtnCompact : ''} ${copyState === 'copied' ? styles.iconBtnSuccess : ''} ${copyState === 'failed' ? styles.iconBtnError : ''}`}
      onClick={() => void copy()}
      aria-label={stateLabel}
      title={stateLabel}
    >
      {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

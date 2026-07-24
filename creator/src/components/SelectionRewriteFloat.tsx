import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { getSelectionFloatingAnchor } from '../lib/textareaCaret'
import shared from '../styles/shared.module.css'
import styles from './SelectionRewriteFloat.module.css'

function RefreshIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M20 4v5h-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface SelectionRewriteFloatProps {
  chips: { label: string; adjustment: string }[]
  loading: boolean
  preview: string | null
  locked: boolean
  actionsDisabled?: boolean
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  selectionStart?: number
  selectionEnd?: number
  onRewrite: (adjustment: string) => void
  onRegenerate: () => void
  onConfirm: () => void
  onCancel: () => void
}

interface FloatPos {
  top: number
  left: number
  width: number
  placement: 'below' | 'above'
  arrowLeft: number
}

export function SelectionRewriteFloat({
  chips,
  loading,
  preview,
  locked,
  actionsDisabled = false,
  textareaRef,
  selectionStart = 0,
  selectionEnd = 0,
  onRewrite,
  onRegenerate,
  onConfirm,
  onCancel,
}: SelectionRewriteFloatProps) {
  const chipDisabled = loading || locked || actionsDisabled
  const previewActionsDisabled = loading || actionsDisabled
  const rootRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<FloatPos | null>(null)
  const floating = !!textareaRef

  useLayoutEffect(() => {
    if (!floating) return

    function update() {
      const ta = textareaRef?.current
      const el = rootRef.current
      if (!ta || !el) return
      const isPreview = preview !== null
      const width = Math.min(isPreview ? 360 : 420, window.innerWidth - 16, ta.clientWidth || 420)
      const height = el.offsetHeight || (isPreview ? 200 : 48)
      const anchor = getSelectionFloatingAnchor(ta, selectionStart, selectionEnd, width, height, {
        align: isPreview ? 'start' : 'center',
        clampToTextareaX: true,
        gap: isPreview ? 12 : 8,
      })
      setPos({
        top: anchor.top,
        left: anchor.left,
        width,
        placement: anchor.placement,
        arrowLeft: anchor.arrowLeft,
      })
    }

    update()
    // Second pass after preview body lays out (height can grow with content).
    const raf = window.requestAnimationFrame(update)

    const ta = textareaRef?.current
    const el = rootRef.current
    const ro =
      typeof ResizeObserver !== 'undefined' && el
        ? new ResizeObserver(() => update())
        : null
    if (el) ro?.observe(el)

    ta?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
      ta?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [floating, textareaRef, selectionStart, selectionEnd, preview, loading])

  const body = (
    <div
      ref={rootRef}
      className={`${styles.root} ${floating ? styles.rootFloating : ''} ${
        preview !== null ? styles.rootPreview : ''
      } ${loading ? styles.rootLoading : ''} ${
        pos?.placement === 'above' ? styles.placementAbove : styles.placementBelow
      }`}
      style={
        floating
          ? pos
            ? {
                top: pos.top,
                left: pos.left,
                width: pos.width,
                ['--float-arrow-x' as string]: `${pos.arrowLeft}px`,
              }
            : { visibility: 'hidden' as const }
          : undefined
      }
      role="region"
      aria-label="选区改写"
      aria-busy={loading || undefined}
    >
      {preview === null ? (
        <div className={styles.bar}>
          <div className={styles.lead}>
            <span className={styles.mark} aria-hidden />
            <span className={styles.label}>{loading ? '改写中…' : '改这段'}</span>
          </div>
          <div className={styles.chips}>
            {chips.map((chip) => (
              <button
                key={chip.adjustment}
                type="button"
                className={styles.chip}
                disabled={chipDisabled}
                onClick={() => onRewrite(chip.adjustment)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.preview}>
          <div className={styles.previewHead}>
            <span className={styles.mark} aria-hidden />
            <p className={styles.previewLabel}>
              {loading ? '重新生成中…' : '预览改写 · 确认后才写入稿面'}
            </p>
          </div>
          <pre className={styles.previewBody}>{preview}</pre>
          <div className={styles.previewActions}>
            <button
              type="button"
              className={styles.regenBtn}
              aria-label="重新生成"
              title="重新生成"
              disabled={previewActionsDisabled}
              onClick={onRegenerate}
            >
              <RefreshIcon />
            </button>
            <button type="button" className={shared.btnGhost} onClick={onCancel}>
              取消
            </button>
            <button
              type="button"
              className={`${shared.btn} ${styles.confirmBtn}`}
              onClick={onConfirm}
              disabled={previewActionsDisabled}
            >
              确认替换选区
            </button>
          </div>
        </div>
      )}
    </div>
  )

  if (floating && typeof document !== 'undefined') {
    return createPortal(body, document.body)
  }
  return body
}

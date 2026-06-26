import { useEffect, useState } from 'react'
import shared from '../styles/shared.module.css'
import { QuotaLimitNotice } from './QuotaLimitNotice'
import styles from './AiSuggestionPanel.module.css'
import type { AiVariant } from '../types/api'

interface AiSuggestionPanelProps {
  stepTitle: string
  suggestion: string | null
  variants: AiVariant[]
  loading: boolean
  quotaBlocked: boolean
  sourceParts: string[]
  adjustments: { label: string; adjustment: string }[]
  onAdoptAll: (content: string) => void
  onInsert: (content: string) => void
  onRegenerate: () => void
  onAdjust: (adjustment: string) => void
  mobileCollapsed?: boolean
  onToggleMobile?: () => void
}

export function AiSuggestionPanel({
  stepTitle,
  suggestion,
  variants,
  loading,
  quotaBlocked,
  sourceParts,
  adjustments,
  onAdoptAll,
  onInsert,
  onRegenerate,
  onAdjust,
  mobileCollapsed = false,
  onToggleMobile,
}: AiSuggestionPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const multiMode = variants.length > 1

  useEffect(() => {
    setSelectedIndex(0)
  }, [variants])
  const activeVariants = multiMode ? variants : suggestion?.trim() ? [{ label: '建议', content: suggestion }] : []
  const safeIndex = Math.min(selectedIndex, Math.max(activeVariants.length - 1, 0))
  const selectedContent = activeVariants[safeIndex]?.content ?? ''
  const hasSuggestion = !!selectedContent.trim()
  const showBody = !mobileCollapsed

  return (
    <aside className={styles.panel} aria-label="AI 建议">
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>AI 建议 · {stepTitle}</h3>
          {multiMode && !loading && !quotaBlocked && (
            <p className={styles.subtitle}>本次生成包含 3 个角度，消耗 1 次 AI 额度</p>
          )}
        </div>
        {onToggleMobile && (
          <button
            type="button"
            className={styles.toggle}
            onClick={onToggleMobile}
            aria-expanded={!mobileCollapsed}
          >
            {mobileCollapsed ? '展开' : '收起'}
          </button>
        )}
      </div>

      {showBody && (
        <div className={styles.body}>
          {loading && (
            <div className={styles.loading} role="status" aria-live="polite">
              <div className={styles.skeleton}>
                <span className={styles.skeletonLine} />
                <span className={styles.skeletonLine} />
                <span className={styles.skeletonLineShort} />
              </div>
              <p className={styles.loadingText}>正在结合品牌档案生成…</p>
            </div>
          )}

          {!loading && quotaBlocked && <QuotaLimitNotice kind="ai" />}

          {!loading && !quotaBlocked && (
            <>
              {multiMode ? (
                <div className={styles.variantGrid} role="listbox" aria-label="AI 方案">
                  {variants.map((variant, index) => (
                    <button
                      key={`${variant.label}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === safeIndex}
                      className={`${styles.variantCard} ${index === safeIndex ? styles.variantActive : ''}`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <span className={styles.variantLabel}>{variant.label}</span>
                      <pre className={styles.variantPreview}>{variant.content}</pre>
                    </button>
                  ))}
                </div>
              ) : (
                <pre className={styles.preview}>
                  {hasSuggestion ? selectedContent : '暂无建议，点击「换一版」生成。'}
                </pre>
              )}

              <div className={shared.btnRow}>
                <button
                  type="button"
                  className={shared.btnPrimary}
                  onClick={() => onAdoptAll(selectedContent)}
                  disabled={!hasSuggestion}
                >
                  采纳全部
                </button>
                <button
                  type="button"
                  className={shared.btn}
                  onClick={() => onInsert(selectedContent)}
                  disabled={!hasSuggestion}
                >
                  插入光标处
                </button>
                <button type="button" className={shared.btnGhost} onClick={onRegenerate}>
                  换一版
                </button>
              </div>

              {adjustments.length > 0 && (
                <div className={styles.adjustments}>
                  {adjustments.map((a) => (
                    <button
                      key={a.adjustment}
                      type="button"
                      className={styles.adjustChip}
                      onClick={() => onAdjust(a.adjustment)}
                      disabled={loading}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}

              {sourceParts.length > 0 && (
                <p className={styles.footnote}>基于：{sourceParts.join(' · ')}</p>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  )
}

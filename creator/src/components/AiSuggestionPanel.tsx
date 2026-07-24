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
  hasActiveSelection: boolean
  onReplaceSelection: (content: string) => void
  onRegenerate: () => void
  onAdjust: (adjustment: string) => void
  mobileCollapsed?: boolean
  onToggleMobile?: () => void
}

const VARIANT_MARKS = ['A', 'B', 'C'] as const

function previewLead(content: string, maxLen = 72): string {
  const line = content
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.length > 0)
  if (!line) return ''
  if (line.length <= maxLen) return line
  return `${line.slice(0, maxLen)}…`
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
  hasActiveSelection,
  onReplaceSelection,
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

  const activeVariants = multiMode
    ? variants
    : suggestion?.trim()
      ? [{ label: '建议', content: suggestion }]
      : []
  const safeIndex = Math.min(selectedIndex, Math.max(activeVariants.length - 1, 0))
  const selected = activeVariants[safeIndex]
  const selectedContent = selected?.content ?? ''
  const hasSuggestion = !!selectedContent.trim()
  const showBody = !mobileCollapsed

  return (
    <aside
      className={`${styles.panel} ${mobileCollapsed ? styles.panelCollapsed : ''}`}
      aria-label="AI 建议"
    >
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            {mobileCollapsed ? 'AI 建议' : `AI 建议 · ${stepTitle}`}
          </h3>
          {mobileCollapsed && (
            <p className={styles.collapsedHint}>展开后可生成、对比并采用草稿</p>
          )}
          {multiMode && !loading && !quotaBlocked && !mobileCollapsed && (
            <p className={styles.subtitle}>3 个角度可对比，本次消耗 1 次 AI 额度</p>
          )}
        </div>
        {onToggleMobile && (
          <button
            type="button"
            className={`${styles.toggle} ${mobileCollapsed ? styles.toggleMint : ''}`}
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
              {multiMode ? (
                <>
                  <div className={styles.variantTabs} aria-hidden>
                    {VARIANT_MARKS.map((mark) => (
                      <span key={mark} className={styles.variantTabSkeleton}>
                        {mark}
                      </span>
                    ))}
                  </div>
                  <div className={styles.skeleton}>
                    <span className={styles.skeletonLine} />
                    <span className={styles.skeletonLine} />
                    <span className={styles.skeletonLineShort} />
                  </div>
                </>
              ) : (
                <div className={styles.skeleton}>
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonLineShort} />
                </div>
              )}
              <p className={styles.loadingText}>正在结合品牌档案生成…</p>
            </div>
          )}

          {!loading && quotaBlocked && <QuotaLimitNotice kind="ai" />}

          {!loading && !quotaBlocked && (
            <>
              {multiMode ? (
                <div className={styles.multiLayout}>
                  <div
                    className={styles.variantTabs}
                    role="tablist"
                    aria-label="AI 方案"
                  >
                    {variants.map((variant, index) => {
                      const active = index === safeIndex
                      const mark = VARIANT_MARKS[index] ?? String(index + 1)
                      return (
                        <button
                          key={`${variant.label}-${index}`}
                          type="button"
                          role="tab"
                          id={`ai-variant-tab-${index}`}
                          aria-selected={active}
                          aria-controls={`ai-variant-panel-${index}`}
                          className={`${styles.variantTab} ${active ? styles.variantTabActive : ''}`}
                          onClick={() => setSelectedIndex(index)}
                        >
                          <span className={styles.variantTabMark}>{mark}</span>
                          <span className={styles.variantTabLabel}>{variant.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div
                    className={styles.variantDetail}
                    role="tabpanel"
                    id={`ai-variant-panel-${safeIndex}`}
                    aria-labelledby={`ai-variant-tab-${safeIndex}`}
                  >
                    {selected && (
                      <>
                        <p className={styles.variantDetailLead}>
                          {previewLead(selected.content) || selected.label}
                        </p>
                        <pre className={styles.variantDetailBody}>{selected.content}</pre>
                      </>
                    )}
                  </div>
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
                  {multiMode ? '采纳当前方案' : '采纳全部'}
                </button>
                {hasActiveSelection ? (
                  <>
                    <button
                      type="button"
                      className={shared.btn}
                      onClick={() => onInsert(selectedContent)}
                      disabled={!hasSuggestion}
                    >
                      插入选区
                    </button>
                    <button
                      type="button"
                      className={shared.btnGhost}
                      onClick={() => onReplaceSelection(selectedContent)}
                      disabled={!hasSuggestion}
                    >
                      替换选区
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={shared.btn}
                    onClick={() => onInsert(selectedContent)}
                    disabled={!hasSuggestion}
                  >
                    插入到末尾
                  </button>
                )}
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

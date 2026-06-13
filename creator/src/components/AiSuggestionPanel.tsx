import shared from '../styles/shared.module.css'
import { QuotaLimitNotice } from './QuotaLimitNotice'
import styles from './AiSuggestionPanel.module.css'

interface AiSuggestionPanelProps {
  stepTitle: string
  suggestion: string | null
  loading: boolean
  quotaBlocked: boolean
  sourceParts: string[]
  adjustments: { label: string; adjustment: string }[]
  onAdoptAll: () => void
  onInsert: () => void
  onRegenerate: () => void
  onAdjust: (adjustment: string) => void
  mobileCollapsed?: boolean
  onToggleMobile?: () => void
}

export function AiSuggestionPanel({
  stepTitle,
  suggestion,
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
  const hasSuggestion = !!suggestion?.trim()
  const showBody = !mobileCollapsed

  return (
    <aside className={styles.panel} aria-label="AI 建议">
      <div className={styles.header}>
        <h3 className={styles.title}>AI 建议 · {stepTitle}</h3>
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
              <pre className={styles.preview}>{hasSuggestion ? suggestion : '暂无建议，点击「换一版」生成。'}</pre>

              <div className={shared.btnRow}>
                <button
                  type="button"
                  className={shared.btnPrimary}
                  onClick={onAdoptAll}
                  disabled={!hasSuggestion}
                >
                  采纳全部
                </button>
                <button
                  type="button"
                  className={shared.btn}
                  onClick={onInsert}
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

import type { Usage } from '../types/api'
import styles from './QuotaDisplay.module.css'

interface QuotaDisplayProps {
  usage: Usage
  compact?: boolean
  /** Quieter chrome for nesting inside menus / popovers. */
  embedded?: boolean
}

function pct(used: number, limit: number) {
  if (limit <= 0) return 0
  return Math.min(100, (used / limit) * 100)
}

function isHigh(used: number, limit: number) {
  return limit > 0 && used / limit >= 0.9
}

function isExhausted(used: number, limit: number) {
  return limit > 0 && used >= limit
}

export function QuotaDisplay({ usage, compact = false, embedded = false }: QuotaDisplayProps) {
  const projectPct = pct(usage.completed_projects, usage.completed_projects_limit)
  const aiPct = pct(usage.ai_calls, usage.ai_calls_limit)
  const pgPct = pct(usage.playground_calls, usage.playground_calls_limit)
  const projectWarn = isHigh(usage.completed_projects, usage.completed_projects_limit)
  const aiWarn = isHigh(usage.ai_calls, usage.ai_calls_limit)
  const pgWarn = isHigh(usage.playground_calls, usage.playground_calls_limit)
  const projectFull = isExhausted(usage.completed_projects, usage.completed_projects_limit)
  const aiFull = isExhausted(usage.ai_calls, usage.ai_calls_limit)
  const pgFull = isExhausted(usage.playground_calls, usage.playground_calls_limit)

  return (
    <div
      className={[
        styles.quota,
        compact ? styles.compact : '',
        embedded ? styles.embedded : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title="本月用量"
      aria-label="本月用量"
    >
      <div className={styles.row}>
        <span className={`${styles.label} ${projectWarn ? styles.warnLabel : ''}`}>
          完成 {usage.completed_projects}/{usage.completed_projects_limit}
        </span>
        <div
          className={`${styles.bar} ${projectWarn ? styles.barWarn : ''} ${projectFull ? styles.barFull : ''}`}
          aria-hidden
        >
          <span style={{ width: `${projectPct}%` }} />
        </div>
      </div>
      <div className={styles.row}>
        <span className={`${styles.label} ${pgWarn ? styles.warnLabel : ''}`}>
          实验室 {usage.playground_calls}/{usage.playground_calls_limit}
        </span>
        <div
          className={`${styles.bar} ${pgWarn ? styles.barWarn : ''} ${pgFull ? styles.barFull : ''}`}
          aria-hidden
        >
          <span style={{ width: `${pgPct}%` }} />
        </div>
      </div>
      <div className={styles.row}>
        <span className={`${styles.label} ${aiWarn ? styles.warnLabel : ''}`}>
          AI {usage.ai_calls}/{usage.ai_calls_limit}
        </span>
        <div
          className={`${styles.bar} ${aiWarn ? styles.barWarn : ''} ${aiFull ? styles.barFull : ''}`}
          aria-hidden
        >
          <span style={{ width: `${aiPct}%` }} />
        </div>
      </div>
    </div>
  )
}

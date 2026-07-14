import type { Usage } from '../types/api'
import styles from './QuotaDisplay.module.css'

interface QuotaDisplayProps {
  usage: Usage
  compact?: boolean
  /** Quieter chrome for nesting inside menus / popovers. */
  embedded?: boolean
}

type MeterTone = 'accent' | 'ai'

type Meter = {
  key: string
  name: string
  used: number
  limit: number
  tone: MeterTone
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
  const meters: Meter[] = [
    {
      key: 'projects',
      name: '完成',
      used: usage.completed_projects,
      limit: usage.completed_projects_limit,
      tone: 'accent',
    },
    {
      key: 'playground',
      name: '实验室',
      used: usage.playground_calls,
      limit: usage.playground_calls_limit,
      tone: 'ai',
    },
    {
      key: 'ai',
      name: 'AI',
      used: usage.ai_calls,
      limit: usage.ai_calls_limit,
      tone: 'ai',
    },
  ]

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
      {meters.map((meter) => {
        const warn = isHigh(meter.used, meter.limit)
        const full = isExhausted(meter.used, meter.limit)
        return (
          <div key={meter.key} className={styles.row}>
            <span className={`${styles.label} ${warn ? styles.warnLabel : ''}`}>
              <span className={styles.name}>{meter.name}</span>
              <span className={styles.frac}>
                {meter.used}/{meter.limit}
              </span>
            </span>
            <div
              className={[
                styles.bar,
                meter.tone === 'ai' ? styles.barAi : '',
                warn ? styles.barWarn : '',
                full ? styles.barFull : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            >
              <span style={{ width: `${pct(meter.used, meter.limit)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

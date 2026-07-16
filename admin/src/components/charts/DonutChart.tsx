import type { ChartSegment } from '../../lib/dashboardCharts'
import { formatMetricValue } from '../../lib/dashboardCharts'
import styles from './DonutChart.module.css'

type DonutChartProps = {
  segments: ChartSegment[]
  centerLabel: string
  centerValue?: string
  size?: number
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 168,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0)
  const radius = 38
  const stroke = 14
  const circumference = 2 * Math.PI * radius
  const dashes = segments.map((segment) => (segment.value / total) * circumference)
  const offsets = dashes.map((_, index) =>
    dashes.slice(0, index).reduce((sum, dash) => sum + dash, 0),
  )

  if (total <= 0) {
    return (
      <div className={styles.wrap} style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className={styles.svg} role="img" aria-label={centerLabel}>
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={stroke}
          />
        </svg>
        <div className={styles.center}>
          <span className={styles.centerValue}>0</span>
          <span className={styles.centerLabel}>{centerLabel}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className={styles.svg} role="img" aria-label={centerLabel}>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={stroke}
        />
        {segments.map((segment, index) => (
          <circle
            key={segment.label}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={segment.color ?? 'var(--signal)'}
            strokeWidth={stroke}
            strokeDasharray={`${dashes[index]} ${circumference - dashes[index]}`}
            strokeDashoffset={-offsets[index]}
            strokeLinecap="butt"
            transform="rotate(-90 50 50)"
          />
        ))}
      </svg>
      <div className={styles.center}>
        <span className={styles.centerValue}>{centerValue ?? formatMetricValue(total)}</span>
        <span className={styles.centerLabel}>{centerLabel}</span>
      </div>
    </div>
  )
}

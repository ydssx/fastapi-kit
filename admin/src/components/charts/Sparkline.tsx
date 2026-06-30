import { formatMetricValue } from '../../lib/dashboardCharts'
import styles from './Sparkline.module.css'

type SparklineProps = {
  label: string
  points: number[]
  current: number
}

export function Sparkline({ label, points, current }: SparklineProps) {
  if (points.length < 2) return null

  const width = 200
  const height = 48
  const padding = 4
  const min = Math.min(...points, 0)
  const max = Math.max(...points, 0)
  const range = max - min || 1

  const coords = points.map((value, index) => {
    const x = padding + (index / (points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const polyline = coords.join(' ')
  const area = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{formatMetricValue(current)}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svg}
        role="img"
        aria-label={`${label}，最近数值 ${formatMetricValue(current)}`}
      >
        <polygon points={area} className={styles.area} />
        <polyline points={polyline} className={styles.line} />
      </svg>
    </div>
  )
}

import { formatMetricValue } from '../../lib/dashboardCharts'
import styles from './MetricBarChart.module.css'

export type MetricBarItem = {
  name: string
  label: string
  value: number
}

type MetricBarChartProps = {
  items: MetricBarItem[]
  emptyMessage?: string
}

export function MetricBarChart({
  items,
  emptyMessage = '暂无 Prometheus 指标',
}: MetricBarChartProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <ul className={styles.chart} aria-label="Prometheus counter 累计值排行">
      {items.map((item, index) => {
        const width = Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)
        const valueLabel = formatMetricValue(item.value)
        return (
          <li
            key={item.name}
            className={styles.row}
            aria-label={`${item.label} 累计 ${valueLabel}`}
          >
            <span className={styles.label} title={item.name}>
              {item.label}
            </span>
            <div className={styles.track} aria-hidden>
              <span
                className={styles.bar}
                style={{
                  width: `${width}%`,
                  animationDelay: `${index * 40}ms`,
                }}
              />
            </div>
            <span className={styles.value} aria-hidden>
              {valueLabel}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

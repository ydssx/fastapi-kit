import { statusToChartColor } from '../../lib/dashboardCharts'
import styles from './HealthRail.module.css'

export type HealthNode = {
  id: string
  label: string
  status: string
  hint?: string | null
}

type HealthRailProps = {
  nodes: HealthNode[]
  overallStatus: string
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ok: '正常',
    active: '正常',
    degraded: '降级',
    stale: '过期',
    error: '异常',
    unknown: '未知',
    offline: '离线',
  }
  return map[status.toLowerCase()] ?? status
}

function nodeAriaLabel(node: HealthNode): string {
  const parts = [`${node.label}：${statusLabel(node.status)}`]
  if (node.hint) parts.push(node.hint)
  return parts.join('，')
}

export function HealthRail({ nodes, overallStatus }: HealthRailProps) {
  return (
    <section className={styles.rail} aria-labelledby="health-rail-title">
      <h4 id="health-rail-title" className={styles.srOnly}>
        依赖健康状态
      </h4>

      <div className={styles.overall}>
        <span
          className={styles.overallDot}
          style={{ background: statusToChartColor(overallStatus) }}
          aria-hidden
        />
        <span className={styles.overallLabel}>整体</span>
        <span className={styles.overallStatus}>{statusLabel(overallStatus)}</span>
      </div>

      <div className={styles.track} aria-hidden>
        <span className={styles.beam} />
      </div>

      <ul className={styles.nodes}>
        {nodes.map((node) => (
          <li key={node.id} className={styles.node} aria-label={nodeAriaLabel(node)}>
            <span
              className={styles.nodeDot}
              style={{ background: statusToChartColor(node.status) }}
              aria-hidden
            />
            <div className={styles.nodeBody}>
              <span className={styles.nodeLabel}>{node.label}</span>
              <span className={styles.nodeStatus}>{statusLabel(node.status)}</span>
              {node.hint && <span className={styles.nodeHint}>{node.hint}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

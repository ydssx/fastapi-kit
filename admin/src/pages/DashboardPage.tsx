import { useQuery } from '@tanstack/react-query'
import { fetchDashboard } from '../api/dashboard'
import { StatusBadge } from '../components/StatusBadge'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 30_000,
  })

  if (isLoading) return <p className={styles.muted}>加载中…</p>
  if (error) return <p className={styles.error}>加载失败：{(error as Error).message}</p>
  if (!data) return null

  const metrics = Object.entries(data.metrics_summary).slice(0, 8)

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>系统概览</h2>
      <div className={styles.grid}>
        <article className={styles.statCard} style={{ animationDelay: '0ms' }}>
          <span className={styles.statLabel}>用户总数</span>
          <span className={styles.statValue}>{data.user_count}</span>
        </article>
        <article className={styles.statCard} style={{ animationDelay: '60ms' }}>
          <span className={styles.statLabel}>活跃用户</span>
          <span className={styles.statValue}>{data.active_user_count}</span>
        </article>
        <article className={styles.statCard} style={{ animationDelay: '120ms' }}>
          <span className={styles.statLabel}>数据库</span>
          <StatusBadge status={data.service_status.database} />
        </article>
        <article className={styles.statCard} style={{ animationDelay: '180ms' }}>
          <span className={styles.statLabel}>Redis</span>
          <StatusBadge status={data.service_status.redis} />
        </article>
      </div>
      {metrics.length > 0 && (
        <section className={styles.metrics}>
          <h3>Prometheus 指标摘要</h3>
          <ul className={styles.metricList}>
            {metrics.map(([name, value]) => (
              <li key={name}>
                <span className={styles.metricName}>{name}</span>
                <span className={styles.metricValue}>{value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

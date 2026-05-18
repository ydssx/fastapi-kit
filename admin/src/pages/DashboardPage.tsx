import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboard } from '../api/dashboard'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import shared from '../styles/shared.module.css'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className={shared.page}>
        <PageHeader title="系统概览" description="服务健康、用户与指标摘要" />
        <LoadingBlock />
      </div>
    )
  }

  if (error) {
    return (
      <div className={shared.page}>
        <PageHeader title="系统概览" />
        <p className={shared.errorText} role="alert">
          加载失败：{(error as Error).message}
        </p>
      </div>
    )
  }

  if (!data) return null

  const metrics = Object.entries(data.metrics_summary).slice(0, 8)
  const sys = data.system
  const replicaLabel =
    sys.api_replicas_reported != null ? String(sys.api_replicas_reported) : '—'

  return (
    <div className={shared.page}>
      <PageHeader title="系统概览" description="每 30 秒自动刷新" />
      {sys.ready_message && <p className={shared.notice}>{sys.ready_message}</p>}

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>运行健康</h3>
        <div className={styles.grid}>
          <StatCard label="就绪状态" delay={0}>
            <StatusBadge status={sys.ready_status} />
          </StatCard>
          <StatCard label="数据库" delay={40}>
            <StatusBadge status={data.service_status.database} />
          </StatCard>
          <StatCard label="Redis" delay={80}>
            <StatusBadge status={data.service_status.redis} />
          </StatCard>
          <StatCard label="数据库迁移" delay={120}>
            <StatusBadge status={sys.migration_at_head ? 'ok' : 'degraded'} />
            <span className={styles.statHint}>
              {sys.migration_revision ?? '—'} / {sys.migration_head_revision ?? '—'}
            </span>
          </StatCard>
          <StatCard label="Celery Beat" delay={160}>
            <StatusBadge status={sys.beat_status} />
            {sys.beat_last_seen && (
              <span className={styles.statHint}>
                {new Date(sys.beat_last_seen).toLocaleString('zh-CN')}
              </span>
            )}
          </StatCard>
          <StatCard label="API 副本" delay={200}>
            <span className={styles.statValue}>{replicaLabel}</span>
            {sys.api_replicas_note && (
              <span className={styles.statHint}>{sys.api_replicas_note}</span>
            )}
          </StatCard>
        </div>
      </section>

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>用户</h3>
        <div className={styles.gridNarrow}>
          <StatCard label="用户总数" delay={0}>
            <span className={styles.statValue}>{data.user_count}</span>
          </StatCard>
          <StatCard label="活跃用户" delay={60}>
            <span className={styles.statValue}>{data.active_user_count}</span>
          </StatCard>
        </div>
      </section>

      {metrics.length > 0 && (
        <section className={shared.section}>
          <h3 className={shared.sectionTitle}>Prometheus 指标</h3>
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

function StatCard({
  label,
  delay,
  children,
}: {
  label: string
  delay: number
  children: ReactNode
}) {
  return (
    <article className={styles.statCard} style={{ animationDelay: `${delay}ms` }}>
      <span className={styles.statLabel}>{label}</span>
      {children}
    </article>
  )
}

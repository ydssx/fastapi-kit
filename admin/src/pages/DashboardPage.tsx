import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboard } from '../api/dashboard'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import shared from '../styles/shared.module.css'
import styles from './DashboardPage.module.css'

type IconTone = 'success' | 'accent'

function StatIcon({ tone, children }: { tone: IconTone; children: ReactNode }) {
  return (
    <span
      className={`${styles.statIcon} ${tone === 'success' ? styles.statIconSuccess : styles.statIconAccent}`}
      aria-hidden
    >
      {children}
    </span>
  )
}

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
          <StatCard label="就绪状态" delay={0} iconTone="success" icon={<CheckCircleIcon />}>
            <StatusBadge status={sys.ready_status} />
          </StatCard>
          <StatCard label="数据库" delay={40} iconTone="success" icon={<DatabaseIcon />}>
            <StatusBadge status={data.service_status.database} />
          </StatCard>
          <StatCard label="Redis" delay={80} iconTone="success" icon={<LayersIcon />}>
            <StatusBadge status={data.service_status.redis} />
          </StatCard>
          <StatCard label="数据库迁移" delay={120} iconTone="success" icon={<DatabaseIcon />}>
            <StatusBadge status={sys.migration_at_head ? 'ok' : 'degraded'} />
            <span className={styles.statHint}>
              {sys.migration_revision ?? '—'} / {sys.migration_head_revision ?? '—'}
            </span>
          </StatCard>
          <StatCard label="Celery Beat" delay={160} iconTone="success" icon={<ClockIcon />}>
            <StatusBadge status={sys.beat_status} />
            {sys.beat_last_seen && (
              <span className={styles.statHint}>
                {new Date(sys.beat_last_seen).toLocaleString('zh-CN')}
              </span>
            )}
          </StatCard>
          <StatCard label="API 副本" delay={200} iconTone="accent" icon={<ServerIcon />}>
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
          <StatCard label="用户总数" delay={0} iconTone="accent" icon={<UsersIcon />} largeValue>
            <span className={styles.statValue}>{data.user_count}</span>
          </StatCard>
          <StatCard label="活跃用户" delay={60} iconTone="accent" icon={<UserIcon />} largeValue>
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
  icon,
  iconTone,
  largeValue,
  children,
}: {
  label: string
  delay: number
  icon: ReactNode
  iconTone: IconTone
  largeValue?: boolean
  children: ReactNode
}) {
  return (
    <article className={styles.statCard} style={{ animationDelay: `${delay}ms` }}>
      <StatIcon tone={iconTone}>{icon}</StatIcon>
      <div className={styles.statBody}>
        <span className={styles.statLabel}>{label}</span>
        {largeValue ? children : <div>{children}</div>}
      </div>
    </article>
  )
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12.83 2.18 8.49 4.92a2 2 0 0 1 0 3.46l-8.49 4.92a2 2 0 0 1-2 0L2.34 10.56a2 2 0 0 1 0-3.46l8.49-4.92a2 2 0 0 1 2 0z" />
      <path d="m2.34 14.44 8.49 4.92a2 2 0 0 0 2 0l8.49-4.92" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <path d="M6 6h.01M6 18h.01" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

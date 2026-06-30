import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboard } from '../api/dashboard'
import { DonutChart } from '../components/charts/DonutChart'
import donutStyles from '../components/charts/DonutChart.module.css'
import { HealthRail } from '../components/charts/HealthRail'
import { MetricBarChart } from '../components/charts/MetricBarChart'
import { Sparkline } from '../components/charts/Sparkline'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { pickTopMetrics } from '../lib/dashboardCharts'
import { buildSparklineDeltaSeries } from '../lib/dashboardSparkline'
import shared from '../styles/shared.module.css'
import styles from './DashboardPage.module.css'

const METRIC_HISTORY_LIMIT = 12

export function DashboardPage() {
  const metricHistoryRef = useRef<Record<string, number>[]>([])
  const [metricHistory, setMetricHistory] = useState<Record<string, number>[]>([])

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!data?.metrics_summary) return
    const last = metricHistoryRef.current.at(-1)
    if (last && JSON.stringify(last) === JSON.stringify(data.metrics_summary)) return
    const next = [...metricHistoryRef.current, data.metrics_summary].slice(-METRIC_HISTORY_LIMIT)
    metricHistoryRef.current = next
    setMetricHistory(next)
  }, [data?.metrics_summary])

  if (isLoading) {
    return (
      <div className={shared.page}>
        <PageHeader description="服务健康、用户与指标摘要" />
        <LoadingBlock />
      </div>
    )
  }

  if (error) {
    return (
      <div className={shared.page}>
        <PageHeader />
        <p className={shared.errorText} role="alert">
          加载失败：{(error as Error).message}
        </p>
      </div>
    )
  }

  if (!data) return null

  const sys = data.system
  const activeCount = Math.min(data.active_user_count, data.user_count)
  const inactiveCount = Math.max(data.user_count - activeCount, 0)
  const userTotal = activeCount + inactiveCount
  const activeRate = userTotal > 0 ? Math.round((activeCount / userTotal) * 100) : 0
  const topMetrics = pickTopMetrics(data.metrics_summary)
  const sparkline = buildSparklineDeltaSeries(data.metrics_summary, metricHistory)
  const replicaLabel =
    sys.api_replicas_reported != null ? String(sys.api_replicas_reported) : '—'

  const healthNodes = [
    { id: 'db', label: 'PostgreSQL', status: data.service_status.database },
    { id: 'redis', label: 'Redis', status: data.service_status.redis },
    {
      id: 'migration',
      label: '数据库迁移',
      status: sys.migration_at_head ? 'ok' : 'degraded',
      hint:
        sys.migration_revision && sys.migration_head_revision
          ? `${sys.migration_revision} / ${sys.migration_head_revision}`
          : null,
    },
    {
      id: 'beat',
      label: 'Celery Beat',
      status: sys.beat_status,
      hint: sys.beat_last_seen
        ? new Date(sys.beat_last_seen).toLocaleString('zh-CN')
        : null,
    },
  ]

  return (
    <div className={shared.page}>
      <PageHeader description="每 30 秒自动刷新 · 图表基于当前快照" />
      {sys.ready_message && <p className={shared.notice}>{sys.ready_message}</p>}

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>系统脉搏</h3>
        <HealthRail nodes={healthNodes} overallStatus={sys.ready_status} />
      </section>

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>用户构成</h3>
        <div className={styles.userChartRow}>
          <DonutChart
            segments={[
              { label: '活跃', value: activeCount, color: 'var(--signal)' },
              { label: '停用', value: inactiveCount, color: '#94a3b8' },
            ]}
            centerLabel="用户总数"
            centerValue={String(userTotal)}
          />
          <div className={styles.userChartAside}>
            <ul className={donutStyles.legend}>
              <li className={donutStyles.legendItem}>
                <span className={donutStyles.legendSwatch} style={{ background: 'var(--signal)' }} />
                <span className={donutStyles.legendLabel}>活跃用户</span>
                <span className={donutStyles.legendValue}>{activeCount}</span>
              </li>
              <li className={donutStyles.legendItem}>
                <span className={donutStyles.legendSwatch} style={{ background: '#94a3b8' }} />
                <span className={donutStyles.legendLabel}>停用用户</span>
                <span className={donutStyles.legendValue}>{inactiveCount}</span>
              </li>
            </ul>
            <p className={styles.rateLine}>
              活跃率 <strong>{activeRate}%</strong>
            </p>
          </div>
        </div>
      </section>

      {(topMetrics.length > 0 || sparkline) && (
        <section className={shared.section}>
          <h3 className={shared.sectionTitle}>Prometheus 指标</h3>
          <p className={styles.metricsHint}>
            折线为近几次刷新的 counter 增量（每 30 秒）；柱状图为当前累计值 Top 8，不可跨指标直接对比。
          </p>
          <div className={styles.metricsLayout}>
            {sparkline && (
              <Sparkline
                label={sparkline.label}
                points={sparkline.points}
                current={sparkline.current}
              />
            )}
            <div className={`${shared.panel} ${styles.metricsPanel}`}>
              <p className={styles.metricsPanelTitle}>累计值 Top 8</p>
              <MetricBarChart items={topMetrics} />
            </div>
          </div>
        </section>
      )}

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>运行明细</h3>
        <div className={styles.detailGrid}>
          <DetailTile label="就绪状态">
            <StatusBadge status={sys.ready_status} />
          </DetailTile>
          <DetailTile label="API 副本">
            <span className={styles.detailValue}>{replicaLabel}</span>
            {sys.api_replicas_note && (
              <span className={styles.detailHint}>{sys.api_replicas_note}</span>
            )}
          </DetailTile>
          <DetailTile label="数据库">
            <StatusBadge status={data.service_status.database} />
          </DetailTile>
          <DetailTile label="Redis">
            <StatusBadge status={data.service_status.redis} />
          </DetailTile>
        </div>
      </section>
    </div>
  )
}

function DetailTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <article className={styles.detailTile}>
      <span className={styles.detailLabel}>{label}</span>
      <div className={styles.detailBody}>{children}</div>
    </article>
  )
}

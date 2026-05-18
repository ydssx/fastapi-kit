import { useQuery } from '@tanstack/react-query'
import { fetchCeleryOverview } from '../api/celery'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import type { BeatScheduleEntry, CeleryTaskInfo, CeleryWorkerInfo } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './CeleryPage.module.css'

const workerColumns: Column<CeleryWorkerInfo>[] = [
  { key: 'name', header: 'Worker', mono: true, render: (w) => w.name },
  { key: 'status', header: '状态', render: (w) => <StatusBadge status={w.status} /> },
  { key: 'active', header: '活跃任务', render: (w) => w.active_tasks },
  { key: 'processed', header: '已处理', render: (w) => w.processed ?? '—' },
]

const beatColumns: Column<BeatScheduleEntry>[] = [
  { key: 'name', header: '名称', render: (e) => e.name },
  { key: 'task', header: '任务', mono: true, render: (e) => e.task },
  { key: 'schedule', header: '调度', mono: true, render: (e) => e.schedule },
]

const taskColumns: Column<CeleryTaskInfo>[] = [
  { key: 'worker', header: 'Worker', mono: true, render: (t) => t.worker },
  { key: 'id', header: '任务 ID', mono: true, render: (t) => t.task_id },
  { key: 'name', header: '任务名', mono: true, render: (t) => t.name },
]

export function CeleryPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['celery'],
    queryFn: fetchCeleryOverview,
    refetchInterval: 15_000,
  })

  if (isLoading) {
    return (
      <div className={shared.page}>
        <PageHeader title="Celery 监控" description="每 15 秒自动刷新" />
        <LoadingBlock />
      </div>
    )
  }

  if (error) {
    return (
      <div className={shared.page}>
        <PageHeader title="Celery 监控" />
        <p className={shared.errorText}>加载失败：{(error as Error).message}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className={shared.page}>
      <PageHeader
        title="Celery 监控"
        description="Worker、Beat 调度与队列任务"
        actions={
          <div className={shared.toolbar}>
            <StatusBadge status={data.status} />
            {data.flower_url && (
              <a
                href={data.flower_url}
                target="_blank"
                rel="noreferrer"
                className={styles.flowerLink}
              >
                打开 Flower
              </a>
            )}
            <button type="button" className={shared.btnSecondary} onClick={() => void refetch()}>
              刷新
            </button>
          </div>
        }
      />
      {data.message && <p className={shared.notice}>{data.message}</p>}

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>Beat 调度</h3>
        <DataTable
          columns={beatColumns}
          rows={data.beat_schedule ?? []}
          rowKey={(e) => e.name}
          emptyMessage="无 Beat 调度配置"
        />
      </section>

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>Workers</h3>
        <DataTable
          columns={workerColumns}
          rows={data.workers}
          rowKey={(w) => w.name}
          emptyMessage="没有在线的 Worker"
        />
      </section>

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>活跃任务</h3>
        <DataTable
          columns={taskColumns}
          rows={data.active_tasks}
          rowKey={(t) => t.task_id}
          emptyMessage="当前无活跃任务"
        />
      </section>

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>预定任务</h3>
        <DataTable
          columns={taskColumns}
          rows={data.scheduled_tasks}
          rowKey={(t) => `${t.worker}-${t.task_id}`}
          emptyMessage="当前无预定任务"
        />
      </section>

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>预留任务</h3>
        <DataTable
          columns={taskColumns}
          rows={data.reserved_tasks ?? []}
          rowKey={(t) => `${t.worker}-${t.task_id}`}
          emptyMessage="当前无预留任务"
        />
      </section>
    </div>
  )
}

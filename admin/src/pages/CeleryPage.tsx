import { useQuery } from '@tanstack/react-query'
import { fetchCeleryOverview } from '../api/celery'
import { DataTable, type Column } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import type { CeleryTaskInfo, CeleryWorkerInfo } from '../types/api'
import styles from './CeleryPage.module.css'

const workerColumns: Column<CeleryWorkerInfo>[] = [
  { key: 'name', header: 'Worker', mono: true, render: (w) => w.name },
  { key: 'status', header: '状态', render: (w) => <StatusBadge status={w.status} /> },
  { key: 'active', header: '活跃任务', render: (w) => w.active_tasks },
  { key: 'processed', header: '已处理', render: (w) => w.processed ?? '—' },
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

  if (isLoading) return <p className={styles.muted}>加载中…</p>
  if (error) return <p className={styles.error}>加载失败：{(error as Error).message}</p>
  if (!data) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Celery 监控</h2>
        <div className={styles.headerRight}>
          <StatusBadge status={data.status} />
          <button type="button" onClick={() => void refetch()}>
            刷新
          </button>
        </div>
      </div>
      {data.message && <p className={styles.notice}>{data.message}</p>}
      <section>
        <h3>Workers</h3>
        <DataTable
          columns={workerColumns}
          rows={data.workers}
          rowKey={(w) => w.name}
          emptyMessage="没有在线的 Worker"
        />
      </section>
      <section>
        <h3>活跃任务</h3>
        <DataTable
          columns={taskColumns}
          rows={data.active_tasks}
          rowKey={(t) => t.task_id}
          emptyMessage="当前无活跃任务"
        />
      </section>
      <section>
        <h3>预定任务</h3>
        <DataTable
          columns={taskColumns}
          rows={data.scheduled_tasks}
          rowKey={(t) => `${t.worker}-${t.task_id}`}
          emptyMessage="当前无预定任务"
        />
      </section>
    </div>
  )
}

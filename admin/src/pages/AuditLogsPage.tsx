import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchAuditLogs } from '../api/audit'
import { DataTable, type Column } from '../components/DataTable'
import type { AuditLog } from '../types/api'
import styles from './AuditLogsPage.module.css'

const columns: Column<AuditLog>[] = [
  {
    key: 'time',
    header: '时间',
    mono: true,
    render: (l) => new Date(l.created_at).toLocaleString('zh-CN'),
  },
  { key: 'action', header: '操作', render: (l) => l.action },
  { key: 'resource', header: '资源', render: (l) => `${l.resource_type}:${l.resource_id ?? '—'}` },
  {
    key: 'actor',
    header: '操作者',
    mono: true,
    render: (l) => l.actor_id?.slice(0, 8) ?? '—',
  },
  { key: 'ip', header: 'IP', mono: true, render: (l) => l.ip ?? '—' },
]

export function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [filterAction, setFilterAction] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, filterAction],
    queryFn: () =>
      fetchAuditLogs({
        page,
        page_size: 20,
        action: filterAction || undefined,
      }),
  })

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>审计日志</h2>
        <form
          className={styles.search}
          onSubmit={(e) => {
            e.preventDefault()
            setFilterAction(action)
            setPage(1)
          }}
        >
          <input
            type="text"
            placeholder="按 action 筛选，如 user.update"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <button type="submit">筛选</button>
        </form>
      </div>
      {isLoading ? (
        <p className={styles.muted}>加载中…</p>
      ) : (
        <>
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(l) => l.id} />
          <div className={styles.pagination}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </button>
            <span>
              第 {page} / {totalPages} 页（共 {data?.total ?? 0} 条）
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )
}

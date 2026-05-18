import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { downloadAuditExport, fetchAuditLogs } from '../api/audit'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import type { AuditLog } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './AuditLogsPage.module.css'

export function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [since, setSince] = useState('')
  const [until, setUntil] = useState('')
  const [filters, setFilters] = useState({ action: '', since: '', until: '' })
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const columns: Column<AuditLog>[] = useMemo(
    () => [
      {
        key: 'time',
        header: '时间',
        mono: true,
        render: (l) => new Date(l.created_at).toLocaleString('zh-CN'),
      },
      { key: 'action', header: '操作', render: (l) => l.action },
      {
        key: 'resource',
        header: '资源',
        render: (l) => `${l.resource_type}:${l.resource_id ?? '—'}`,
      },
      {
        key: 'actor',
        header: '操作者',
        mono: true,
        render: (l) => l.actor_id?.slice(0, 8) ?? '—',
      },
      { key: 'ip', header: 'IP', mono: true, render: (l) => l.ip ?? '—' },
      {
        key: 'view',
        header: '',
        render: (l) => (
          <button type="button" className={shared.btnSecondary} onClick={() => setSelected(l)}>
            详情
          </button>
        ),
      },
    ],
    [],
  )

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, filters],
    queryFn: () =>
      fetchAuditLogs({
        page,
        page_size: 20,
        action: filters.action || undefined,
        since: filters.since || undefined,
        until: filters.until || undefined,
      }),
  })

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <div className={shared.page}>
      <PageHeader
        title="审计日志"
        description="筛选后导出 CSV，单次最多 5000 行"
        actions={
          <form
            className={shared.toolbar}
            onSubmit={(e) => {
              e.preventDefault()
              setFilters({
                action,
                since: since ? new Date(since).toISOString() : '',
                until: until ? new Date(until).toISOString() : '',
              })
              setPage(1)
            }}
          >
            <input
              type="text"
              className={shared.input}
              placeholder="action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <input
              type="datetime-local"
              className={shared.input}
              value={since}
              onChange={(e) => setSince(e.target.value)}
              title="起始时间"
            />
            <input
              type="datetime-local"
              className={shared.input}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              title="结束时间"
            />
            <button type="submit" className={shared.btnPrimary}>
              筛选
            </button>
            <button
              type="button"
              className={shared.btnSecondary}
              onClick={() =>
                void downloadAuditExport({
                  action: filters.action || undefined,
                  since: filters.since || undefined,
                  until: filters.until || undefined,
                })
              }
            >
              导出 CSV
            </button>
          </form>
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <>
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(l) => l.id} />
          <div className={shared.pagination}>
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
      {selected && (
        <div className={styles.modalBackdrop} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 className={styles.modalTitle}>审计详情</h3>
            <pre className={styles.detailJson}>{JSON.stringify(selected, null, 2)}</pre>
            <button type="button" className={shared.btnSecondary} onClick={() => setSelected(null)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

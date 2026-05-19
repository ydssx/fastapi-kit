import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchLogs } from '../api/logs'
import { DataTable, type Column } from '../components/DataTable'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import type { LogEntry } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './LogsPage.module.css'

const LOKI_UNAVAILABLE = 50301

export function LogsPage() {
  const [page, setPage] = useState(1)
  const [requestId, setRequestId] = useState('')
  const [level, setLevel] = useState('')
  const [q, setQ] = useState('')
  const [since, setSince] = useState('')
  const [until, setUntil] = useState('')
  const [filters, setFilters] = useState({
    request_id: '',
    level: '',
    q: '',
    since: '',
    until: '',
  })
  const [selected, setSelected] = useState<LogEntry | null>(null)

  const columns: Column<LogEntry>[] = useMemo(
    () => [
      {
        key: 'time',
        header: '时间',
        mono: true,
        render: (e) => new Date(e.timestamp).toLocaleString('zh-CN'),
      },
      { key: 'level', header: '级别', render: (e) => e.level ?? '—' },
      {
        key: 'request_id',
        header: 'Request ID',
        mono: true,
        render: (e) => e.request_id ?? '—',
      },
      { key: 'message', header: '消息', render: (e) => e.message ?? '—' },
      {
        key: 'view',
        header: '',
        render: (e) => (
          <button type="button" className={shared.btnSecondary} onClick={() => setSelected(e)}>
            详情
          </button>
        ),
      },
    ],
    [],
  )

  const { data, isLoading, error } = useQuery({
    queryKey: ['logs', page, filters],
    queryFn: () =>
      fetchLogs({
        page,
        page_size: 50,
        request_id: filters.request_id || undefined,
        level: filters.level || undefined,
        q: filters.q || undefined,
        since: filters.since || undefined,
        until: filters.until || undefined,
      }),
    retry: false,
  })

  const lokiUnavailable =
    error instanceof ApiError && error.code === LOKI_UNAVAILABLE

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  return (
    <div className={shared.page}>
      <PageHeader
        title="应用日志"
        description="只读查询；需启用 ops profile 启动 Loki 与 Promtail"
      />

      {lokiUnavailable && (
        <p className={shared.notice}>
          日志聚合未配置或不可用。请执行：
          <code className={styles.code}> docker compose --profile ops up -d loki promtail </code>
          并在 API 环境变量中设置 <code className={styles.code}>LOKI_URL=http://loki:3100</code>。
        </p>
      )}

      <form
        className={styles.filters}
        onSubmit={(e) => {
          e.preventDefault()
          setFilters({
            request_id: requestId.trim(),
            level: level.trim(),
            q: q.trim(),
            since: since ? new Date(since).toISOString() : '',
            until: until ? new Date(until).toISOString() : '',
          })
          setPage(1)
        }}
      >
        <input
          type="text"
          className={shared.input}
          placeholder="request_id"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        />
        <input
          type="text"
          className={shared.input}
          placeholder="level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        />
        <input
          type="text"
          className={shared.input}
          placeholder="关键字"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          type="datetime-local"
          className={shared.input}
          value={since}
          onChange={(e) => setSince(e.target.value)}
        />
        <input
          type="datetime-local"
          className={shared.input}
          value={until}
          onChange={(e) => setUntil(e.target.value)}
        />
        <button type="submit" className={shared.btnPrimary} disabled={lokiUnavailable}>
          查询
        </button>
      </form>

      {isLoading ? (
        <LoadingBlock />
      ) : error && !lokiUnavailable ? (
        <p className={shared.errorText}>加载失败：{(error as Error).message}</p>
      ) : data ? (
        <>
          <DataTable
            columns={columns}
            rows={data.items}
            rowKey={(e) => `${e.timestamp}-${e.request_id ?? ''}-${e.message ?? ''}`}
          />
          {totalPages > 1 && (
            <div className={shared.pagination}>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                上一页
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </>
      ) : null}

      {selected && (
        <div className={styles.modalBackdrop} onClick={() => setSelected(null)} role="presentation">
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="log-detail-title"
          >
            <h2 id="log-detail-title" className={styles.modalTitle}>
              日志详情
            </h2>
            <pre className={styles.json}>{JSON.stringify(selected.raw, null, 2)}</pre>
            <button type="button" className={shared.btnSecondary} onClick={() => setSelected(null)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

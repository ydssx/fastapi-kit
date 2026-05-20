import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchLogs } from '../api/logs'
import { CopyJsonButton } from '../components/CopyJsonButton'
import { DataTable, TABLE_SCROLL_MAX_HEIGHT, type Column } from '../components/DataTable'
import { DetailMeta } from '../components/DetailMeta'
import { JsonPreview } from '../components/JsonPreview'
import { LoadingBlock } from '../components/LoadingBlock'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { PaginationBar } from '../components/PaginationBar'
import { StatusBadge } from '../components/StatusBadge'
import type { LogEntry } from '../types/api'
import {
  dateTimeLocalToIso,
  defaultTodayRangeIso,
  defaultTodayRangeLocal,
} from '../lib/datetime'
import shared from '../styles/shared.module.css'
import styles from './LogsPage.module.css'

const TODAY_LOCAL = defaultTodayRangeLocal()
const TODAY_ISO = defaultTodayRangeIso()

const LOKI_UNAVAILABLE = 50301

const LEVEL_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'error', label: 'ERROR' },
  { value: 'warn', label: 'WARN' },
  { value: 'info', label: 'INFO' },
  { value: 'debug', label: 'DEBUG' },
]

function logLevelVariant(level: string | null): 'ok' | 'warn' | 'error' | 'neutral' {
  const normalized = (level ?? '').toLowerCase()
  if (normalized === 'error' || normalized === 'critical' || normalized === 'fatal') {
    return 'error'
  }
  if (normalized === 'warn' || normalized === 'warning') {
    return 'warn'
  }
  if (normalized === 'info' || normalized === 'debug') {
    return 'ok'
  }
  return 'neutral'
}

export function LogsPage() {
  const [page, setPage] = useState(1)
  const [requestId, setRequestId] = useState('')
  const [level, setLevel] = useState('')
  const [q, setQ] = useState('')
  const [since, setSince] = useState(TODAY_LOCAL.since)
  const [until, setUntil] = useState(TODAY_LOCAL.until)
  const [filters, setFilters] = useState({
    request_id: '',
    level: '',
    q: '',
    since: TODAY_ISO.since,
    until: TODAY_ISO.until,
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
      {
        key: 'level',
        header: '级别',
        render: (e) =>
          e.level ? (
            <StatusBadge status={e.level.toUpperCase()} variant={logLevelVariant(e.level)} />
          ) : (
            '—'
          ),
      },
      {
        key: 'request_id',
        header: 'Request ID',
        mono: true,
        render: (e) => e.request_id ?? '—',
      },
      { key: 'message', header: '消息', render: (e) => e.message ?? '—' },
      {
        key: 'view',
        header: '操作',
        render: (e) => (
          <button type="button" className={shared.btnLink} onClick={() => setSelected(e)}>
            详情
          </button>
        ),
      },
    ],
    [],
  )

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['logs', page, filters],
    queryFn: async () => {
      const params = {
        page,
        page_size: 20,
        request_id: filters.request_id || undefined,
        level: filters.level || undefined,
        q: filters.q || undefined,
        since: filters.since || undefined,
        until: filters.until || undefined,
      }
      const result = await fetchLogs(params)
      const tp = Math.max(1, Math.ceil(result.total / result.page_size))
      if (page > tp) {
        setPage(tp)
        return fetchLogs({ ...params, page: tp })
      }
      return result
    },
    retry: false,
    refetchInterval: (query) => {
      const err = query.state.error
      if (err instanceof ApiError && err.code === LOKI_UNAVAILABLE) return false
      return 30_000
    },
  })

  const lokiUnavailable =
    error instanceof ApiError && error.code === LOKI_UNAVAILABLE

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1
  const currentPage = Math.min(page, totalPages)

  return (
    <div className={shared.page}>
      <PageHeader
        title="应用日志"
        description="只读查询；每 30 秒自动刷新；需启用 ops profile 启动 Loki 与 Promtail"
        actions={
          <button
            type="button"
            className={shared.btnSecondary}
            disabled={lokiUnavailable || isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? '刷新中…' : '刷新'}
          </button>
        }
      />

      {lokiUnavailable && (
        <p className={shared.notice}>
          日志聚合未配置或不可用。请执行：
          <code className={styles.code}> docker compose --profile ops up -d loki promtail </code>
          并在 API 环境变量中设置 <code className={styles.code}>LOKI_URL=http://loki:3100</code>。
        </p>
      )}

      <form
        className={shared.toolbar}
        onSubmit={(e) => {
          e.preventDefault()
          setFilters({
            request_id: requestId.trim(),
            level: level.trim(),
            q: q.trim(),
            since: dateTimeLocalToIso(since),
            until: dateTimeLocalToIso(until),
          })
          setPage(1)
        }}
      >
        <label className={shared.filterField}>
          Request ID
          <input
            type="text"
            className={shared.input}
            placeholder="request_id"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
          />
        </label>
        <label className={shared.filterField}>
          级别
          <select
            className={shared.select}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className={shared.filterField}>
          关键字
          <input
            type="text"
            className={shared.input}
            placeholder="关键字"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className={shared.filterField}>
          开始时间
          <input
            type="datetime-local"
            className={shared.input}
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </label>
        <label className={shared.filterField}>
          结束时间
          <input
            type="datetime-local"
            className={shared.input}
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
        </label>
        <button type="submit" className={shared.btnPrimary} disabled={lokiUnavailable}>
          查询
        </button>
      </form>

      {isLoading ? (
        <LoadingBlock />
      ) : error && !lokiUnavailable ? (
        <p className={shared.errorText} role="alert">
          加载失败：{(error as Error).message}
        </p>
      ) : data ? (
        <>
          <DataTable
            columns={columns}
            rows={data.items}
            rowKey={(e) => `${e.timestamp}-${e.request_id ?? ''}-${e.message ?? ''}`}
            scrollMaxHeight={TABLE_SCROLL_MAX_HEIGHT}
          />
          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      ) : null}

      {selected && (
        <Modal
          title="日志详情"
          titleId="log-detail-title"
          wide
          onClose={() => setSelected(null)}
          headerActions={<CopyJsonButton key={selected.timestamp} value={selected.raw} />}
        >
          <DetailMeta
            items={[
              {
                label: '时间',
                value: new Date(selected.timestamp).toLocaleString('zh-CN'),
              },
              {
                label: '级别',
                value: selected.level ? (
                  <StatusBadge
                    status={selected.level.toUpperCase()}
                    variant={logLevelVariant(selected.level)}
                  />
                ) : (
                  '—'
                ),
              },
              {
                label: 'Request ID',
                value: <span className={styles.code}>{selected.request_id ?? '—'}</span>,
              },
              { label: '消息', value: selected.message ?? '—' },
            ]}
          />
          <p className={shared.detailSectionLabel}>详情</p>
          <JsonPreview value={selected.raw} />
          <div className={shared.modalActions}>
            <button type="button" className={shared.btnSecondary} onClick={() => setSelected(null)}>
              关闭
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

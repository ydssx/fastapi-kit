import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { downloadAuditExport, fetchAuditLogs } from '../api/audit'
import { CopyJsonButton } from '../components/CopyJsonButton'
import { DataTable, TABLE_SCROLL_MAX_HEIGHT, type Column } from '../components/DataTable'
import { DetailMeta } from '../components/DetailMeta'
import { JsonPreview } from '../components/JsonPreview'
import { LoadingBlock } from '../components/LoadingBlock'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { PaginationBar } from '../components/PaginationBar'
import type { AuditLog } from '../types/api'
import shared from '../styles/shared.module.css'

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
        header: '操作',
        render: (l) => (
          <button type="button" className={shared.btnLink} onClick={() => setSelected(l)}>
            详情
          </button>
        ),
      },
    ],
    [],
  )

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit', page, filters],
    queryFn: async () => {
      const params = {
        page,
        page_size: 20,
        action: filters.action || undefined,
        since: filters.since || undefined,
        until: filters.until || undefined,
      }
      const result = await fetchAuditLogs(params)
      const tp = Math.max(1, Math.ceil(result.total / result.page_size))
      if (page > tp) {
        setPage(tp)
        return fetchAuditLogs({ ...params, page: tp })
      }
      return result
    },
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1
  const currentPage = Math.min(page, totalPages)

  return (
    <div className={shared.page}>
      <PageHeader
        title="审计日志"
        description="手动刷新；筛选后导出 CSV，单次最多 5000 行"
        actions={
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
        }
      />

      <form
        className={shared.toolbar}
        onSubmit={(e) => {
          e.preventDefault()
          setFilters({
            action: action.trim(),
            since: since ? new Date(since).toISOString() : '',
            until: until ? new Date(until).toISOString() : '',
          })
          setPage(1)
        }}
      >
        <label className={shared.filterField}>
          Action
          <input
            type="text"
            className={shared.input}
            placeholder="action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </label>
        <label className={shared.filterField}>
          起始时间
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
        <button type="submit" className={shared.btnPrimary}>
          筛选
        </button>
      </form>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <p className={shared.errorText} role="alert">
          加载失败：{(error as Error).message}
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(l) => l.id}
            scrollMaxHeight={TABLE_SCROLL_MAX_HEIGHT}
          />
          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        </>
      )}

      {selected && (
        <Modal
          title="审计详情"
          titleId="audit-detail-title"
          wide
          onClose={() => setSelected(null)}
          headerActions={<CopyJsonButton key={selected.id} value={selected} />}
        >
          <DetailMeta
            items={[
              {
                label: '时间',
                value: new Date(selected.created_at).toLocaleString('zh-CN'),
              },
              { label: '操作', value: selected.action },
              {
                label: '资源',
                value: `${selected.resource_type}:${selected.resource_id ?? '—'}`,
              },
              { label: '操作者', value: selected.actor_id ?? '—' },
              { label: 'IP', value: selected.ip ?? '—' },
            ]}
          />
          <p className={shared.detailSectionLabel}>详情</p>
          <JsonPreview value={selected} />
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

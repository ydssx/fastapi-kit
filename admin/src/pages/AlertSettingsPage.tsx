import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  fetchAlertDeliveries,
  fetchAlertSettings,
  sendAlertTest,
  updateAlertSettings,
} from '../api/alerts'
import { DataTable, TABLE_SCROLL_MAX_HEIGHT, type Column } from '../components/DataTable'
import { LoadingBlock } from '../components/LoadingBlock'
import { PageHeader } from '../components/PageHeader'
import { PaginationBar } from '../components/PaginationBar'
import { StatusBadge } from '../components/StatusBadge'
import type { AlertDelivery } from '../types/api'
import shared from '../styles/shared.module.css'
import styles from './AlertSettingsPage.module.css'

const deliveryColumns: Column<AlertDelivery>[] = [
  {
    key: 'time',
    header: '时间',
    mono: true,
    render: (d) => new Date(d.created_at).toLocaleString('zh-CN'),
  },
  { key: 'event', header: '事件', render: (d) => d.event_type },
  {
    key: 'status',
    header: '结果',
    render: (d) => <StatusBadge status={d.success ? 'ok' : 'error'} />,
  },
  {
    key: 'http',
    header: 'HTTP',
    mono: true,
    render: (d) => (d.http_status != null ? String(d.http_status) : '—'),
  },
]

export function AlertSettingsPage() {
  const queryClient = useQueryClient()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [recovery, setRecovery] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [deliveryPage, setDeliveryPage] = useState(1)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: async () => {
      const s = await fetchAlertSettings()
      setWebhookUrl(s.webhook_url ?? '')
      setRecovery(s.recovery_notifications_enabled)
      return s
    },
  })

  const { data: deliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['alert-deliveries', deliveryPage],
    queryFn: async () => {
      const result = await fetchAlertDeliveries(deliveryPage, 20)
      const tp = Math.max(1, Math.ceil(result.total / result.page_size))
      if (deliveryPage > tp) {
        setDeliveryPage(tp)
        return fetchAlertDeliveries(tp, 20)
      }
      return result
    },
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAlertSettings({
        webhook_url: webhookUrl.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
        recovery_notifications_enabled: recovery,
      }),
    onSuccess: () => {
      setWebhookSecret('')
      setMessage('设置已保存')
      void queryClient.invalidateQueries({ queryKey: ['alert-settings'] })
    },
    onError: (err: Error) => setMessage(err.message),
  })

  const testMutation = useMutation({
    mutationFn: sendAlertTest,
    onSuccess: (result) => {
      setMessage(result.message)
      void queryClient.invalidateQueries({ queryKey: ['alert-deliveries'] })
    },
    onError: (err: Error) => setMessage(err.message),
  })

  const deliveryTotalPages = deliveries
    ? Math.max(1, Math.ceil(deliveries.total / deliveries.page_size))
    : 1
  const currentDeliveryPage = Math.min(deliveryPage, deliveryTotalPages)

  if (isLoading) {
    return (
      <div className={shared.page}>
        <PageHeader />
        <LoadingBlock />
      </div>
    )
  }

  return (
    <div className={shared.page}>
      <PageHeader description="配置 Webhook 后，Beat 或依赖异常时将推送 JSON 告警（通用格式，可对接 Slack/钉钉）" />

      {!settings?.webhook_enabled && (
        <p className={shared.notice}>当前未启用告警：填写 Webhook URL 并保存后即可测试发送。</p>
      )}

      <form
        className={`${shared.panel} ${styles.form}`}
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <label className={styles.field}>
          <span>Webhook URL</span>
          <input
            type="url"
            className={shared.input}
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.example.com/..."
          />
        </label>
        <label className={styles.field}>
          <span>签名密钥（可选）</span>
          <input
            type="password"
            className={shared.input}
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={
              settings?.webhook_secret_configured ? '留空表示不修改已保存的密钥' : '可选 HMAC 密钥'
            }
          />
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={recovery}
            onChange={(e) => setRecovery(e.target.checked)}
          />
          故障恢复时发送恢复通知
        </label>
        <div className={shared.toolbar}>
          <button type="submit" className={shared.btnPrimary} disabled={saveMutation.isPending}>
            保存
          </button>
          <button
            type="button"
            className={shared.btnSecondary}
            disabled={testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            测试发送
          </button>
        </div>
        {message && <p className={shared.muted}>{message}</p>}
      </form>

      <section className={shared.section}>
        <h3 className={shared.sectionTitle}>最近发送记录</h3>
        {deliveriesLoading ? (
          <LoadingBlock />
        ) : (
          <>
            <DataTable
              columns={deliveryColumns}
              rows={deliveries?.items ?? []}
              rowKey={(d) => d.id}
              scrollMaxHeight={TABLE_SCROLL_MAX_HEIGHT}
            />
            <PaginationBar
              page={currentDeliveryPage}
              totalPages={deliveryTotalPages}
              total={deliveries?.total ?? 0}
              onPageChange={setDeliveryPage}
            />
          </>
        )}
      </section>
    </div>
  )
}

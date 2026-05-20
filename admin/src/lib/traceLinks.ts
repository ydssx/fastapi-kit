/** 构建日志页查询参数字符串（ISO since/until，与 API 一致）。 */
export function buildLogsSearchParams(opts: {
  request_id?: string
  since?: string
  until?: string
  level?: string
  q?: string
}): URLSearchParams {
  const params = new URLSearchParams()
  if (opts.request_id) params.set('request_id', opts.request_id)
  if (opts.since) params.set('since', opts.since)
  if (opts.until) params.set('until', opts.until)
  if (opts.level) params.set('level', opts.level)
  if (opts.q) params.set('q', opts.q)
  return params
}

const AUDIT_LOG_WINDOW_MS = 15 * 60 * 1000

/** 审计详情「查日志」：操作时间 ±15 分钟 + request_id。 */
export function buildLogsPathFromAudit(createdAt: string, requestId: string): string {
  const center = new Date(createdAt)
  const since = new Date(center.getTime() - AUDIT_LOG_WINDOW_MS).toISOString()
  const until = new Date(center.getTime() + AUDIT_LOG_WINDOW_MS).toISOString()
  const params = buildLogsSearchParams({ request_id: requestId, since, until })
  return `/logs?${params.toString()}`
}

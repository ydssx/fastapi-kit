export type LogLevelVariant = 'ok' | 'warn' | 'error' | 'neutral'

export function logLevelVariant(level: string | null): LogLevelVariant {
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

const FIELD_LABELS: Record<string, string> = {
  logger: '记录器',
  pathname: '路径',
  lineno: '行号',
  func_name: '函数',
  exc_info: '异常栈',
  timestamp: '时间戳',
}

const HERO_KEYS = new Set(['level', 'event', 'message', 'request_id', 'timestamp'])

export function logFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key
}

export function extractLogExtraFields(
  raw: Record<string, unknown>,
): Array<{ key: string; label: string; value: string }> {
  return Object.entries(raw)
    .filter(([key]) => !HERO_KEYS.has(key))
    .map(([key, value]) => ({
      key,
      label: logFieldLabel(key),
      value: formatLogFieldValue(value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

function formatLogFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function formatLogTimestamp(iso: string): {
  local: string
  utc: string
} {
  const date = new Date(iso)
  return {
    local: date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    }),
    utc: date.toISOString(),
  }
}

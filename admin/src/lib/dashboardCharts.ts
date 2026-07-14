export type ChartSegment = {
  label: string
  value: number
  color?: string
}

export function formatMetricLabel(name: string): string {
  return name
    .replace(/_total$/, '')
    .replace(/_created$/, '')
    .replace(/^fastapi_kit_/, '')
    .replace(/_/g, ' ')
}

export function pickTopMetrics(
  summary: Record<string, number>,
  limit = 8,
): { name: string; label: string; value: number }[] {
  return Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({
      name,
      label: formatMetricLabel(name),
      value,
    }))
}

export function statusToChartColor(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'ok' || normalized === 'active') return 'var(--success-icon-fg)'
  if (normalized === 'degraded' || normalized === 'stale' || normalized === 'warn') {
    return '#d97706'
  }
  if (normalized === 'error' || normalized === 'offline' || normalized === 'unknown') {
    return 'var(--danger)'
  }
  return '#64748b'
}

export function formatMetricValue(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2)
}

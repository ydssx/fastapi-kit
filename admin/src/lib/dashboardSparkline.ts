import { formatMetricLabel } from './dashboardCharts'

export const DASHBOARD_REFRESH_INTERVAL_SEC = 30

const PREFERRED_SPARKLINE_KEYS = ['http_requests_total', 'fastapi_kit_http_requests_total']

export type SparklineDeltaSeries = {
  metricName: string
  label: string
  points: number[]
  /** 最近一次刷新窗口的 counter 增量 */
  current: number
}

function resolveSparklineMetricName(summary: Record<string, number>): string | null {
  return (
    PREFERRED_SPARKLINE_KEYS.find((key) => key in summary) ??
    Object.keys(summary).find((key) => key.includes('http') && key.endsWith('_total')) ??
    null
  )
}

/** counter 回落时视为进程重启，以当前值作为增量 */
export function counterDelta(previous: number, current: number): number {
  return current >= previous ? current - previous : current
}

export function buildSparklineDeltaSeries(
  summary: Record<string, number>,
  history: Record<string, number>[],
): SparklineDeltaSeries | null {
  const name = resolveSparklineMetricName(summary)
  if (!name || history.length < 2) return null

  const deltas: number[] = []
  for (let i = 1; i < history.length; i += 1) {
    const previous = history[i - 1]![name]
    const current = history[i]![name]
    if (previous == null || current == null) continue
    deltas.push(counterDelta(previous, current))
  }

  if (deltas.length < 2) return null

  return {
    metricName: name,
    label: `${formatMetricLabel(name)} · 每 ${DASHBOARD_REFRESH_INTERVAL_SEC}s 增量`,
    points: deltas,
    current: deltas[deltas.length - 1]!,
  }
}

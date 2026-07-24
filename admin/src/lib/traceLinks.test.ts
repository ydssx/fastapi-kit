import { describe, expect, it } from 'vitest'

import { buildLogsPathFromAudit, buildLogsSearchParams } from './traceLinks'

describe('traceLinks', () => {
  it('仅写入有值的日志筛选参数', () => {
    const params = buildLogsSearchParams({
      request_id: 'req/42',
      since: '2026-07-16T01:00:00.000Z',
      until: '',
      level: 'error',
      q: 'database timeout',
    })

    expect(params.toString()).toBe(
      'request_id=req%2F42&since=2026-07-16T01%3A00%3A00.000Z&level=error&q=database+timeout',
    )
  })

  it('为审计事件生成前后十五分钟的日志深链', () => {
    const path = buildLogsPathFromAudit('2026-07-16T08:30:00.000Z', 'req-123')
    const url = new URL(path, 'https://localhost/admin/')

    expect(url.pathname).toBe('/logs')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      request_id: 'req-123',
      since: '2026-07-16T08:15:00.000Z',
      until: '2026-07-16T08:45:00.000Z',
    })
  })
})

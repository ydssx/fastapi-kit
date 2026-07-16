import { describe, expect, it } from 'vitest'

import {
  extractLogExtraFields,
  formatLogTimestamp,
  logFieldLabel,
  logLevelVariant,
} from './logDisplay'

describe('logDisplay', () => {
  it.each([
    ['ERROR', 'error'],
    ['critical', 'error'],
    ['warning', 'warn'],
    ['INFO', 'ok'],
    ['debug', 'ok'],
    [null, 'neutral'],
    ['trace', 'neutral'],
  ] as const)('将日志级别 %s 映射为 %s', (level, expected) => {
    expect(logLevelVariant(level)).toBe(expected)
  })

  it('翻译已知字段并保留未知字段名', () => {
    expect(logFieldLabel('pathname')).toBe('路径')
    expect(logFieldLabel('worker_id')).toBe('worker_id')
  })

  it('排除主字段、格式化值并按中文标签排序', () => {
    const fields = extractLogExtraFields({
      level: 'info',
      message: 'done',
      request_id: 'req-1',
      pathname: '/health',
      lineno: 42,
      active: true,
      context: { attempt: 2 },
      nullable: null,
    })

    expect(fields).toEqual([
      { key: 'pathname', label: '路径', value: '/health' },
      { key: 'lineno', label: '行号', value: '42' },
      { key: 'active', label: 'active', value: 'true' },
      { key: 'context', label: 'context', value: '{\n  "attempt": 2\n}' },
      { key: 'nullable', label: 'nullable', value: '—' },
    ])
  })

  it('同时返回本地展示时间和标准 UTC 时间', () => {
    const timestamp = formatLogTimestamp('2026-07-16T08:30:45.123Z')

    expect(timestamp.utc).toBe('2026-07-16T08:30:45.123Z')
    expect(timestamp.local).toContain('2026')
    expect(timestamp.local).toContain('123')
  })
})

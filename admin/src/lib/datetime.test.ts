import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  dateTimeLocalToIso,
  defaultTodayRangeIso,
  defaultTodayRangeLocal,
  formatDateTimeLocal,
  isoToDateTimeLocal,
} from './datetime'

describe('datetime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 16, 12, 34, 56))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('按本地时间格式化 datetime-local 值', () => {
    expect(formatDateTimeLocal(new Date(2026, 0, 2, 3, 4))).toBe('2026-01-02T03:04')
  })

  it('生成当天本地时间与对应 ISO 范围', () => {
    const local = defaultTodayRangeLocal()

    expect(local).toEqual({
      since: '2026-07-16T00:00',
      until: '2026-07-16T23:59',
    })
    expect(defaultTodayRangeIso()).toEqual({
      since: new Date(local.since).toISOString(),
      until: new Date(local.until).toISOString(),
    })
  })

  it('在本地控件值与 ISO 之间转换，并处理空值和无效值', () => {
    const local = '2026-07-16T08:09'
    const iso = dateTimeLocalToIso(local)

    expect(iso).toBe(new Date(local).toISOString())
    expect(isoToDateTimeLocal(iso)).toBe(local)
    expect(dateTimeLocalToIso('')).toBe('')
    expect(isoToDateTimeLocal('not-a-date')).toBe('2026-07-16T00:00')
  })
})

/** `<input type="datetime-local" />` 值（本地时区，精确到分钟）。 */
export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 0, 0)
  return d
}

/** 当天 00:00 – 23:59，供 datetime-local 控件使用。 */
export function defaultTodayRangeLocal(): { since: string; until: string } {
  return {
    since: formatDateTimeLocal(startOfToday()),
    until: formatDateTimeLocal(endOfToday()),
  }
}

export function dateTimeLocalToIso(value: string): string {
  return value ? new Date(value).toISOString() : ''
}

/** ISO 8601 → `<input type="datetime-local" />`；无效 ISO 回退当天 00:00。 */
export function isoToDateTimeLocal(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return formatDateTimeLocal(startOfToday())
  }
  return formatDateTimeLocal(parsed)
}

/** 当天范围，供 API `since` / `until` 查询参数使用。 */
export function defaultTodayRangeIso(): { since: string; until: string } {
  const local = defaultTodayRangeLocal()
  return {
    since: dateTimeLocalToIso(local.since),
    until: dateTimeLocalToIso(local.until),
  }
}

---
title: Admin logs page missing refresh, broken pagination, and overly tall table
date: 2026-05-19
category: ui-bugs
module: admin
problem_type: logic_error
component: tooling
symptoms:
  - "Logs list does not update while staying on /admin/logs; user must change filters or switch browser tabs"
  - "Clicking 下一页 shows empty rows or pagination controls never appear"
  - "Log table with 50 rows pushes filters and pagination off-screen; user must scroll the whole page"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - admin-spa
  - logs-page
  - loki
  - pagination
  - react-query
  - refetch-interval
  - data-table
  - scroll-max-height
related_components:
  - admin_logs
  - data-table
---

# Admin logs page missing refresh, broken pagination, and overly tall table

## Problem

The admin **应用日志** page (`/admin/logs`) shipped without live refresh, had non-functional pagination against Loki, and displayed up to 50 full-height rows so one screen felt excessively long.

## Symptoms

- No periodic refresh; only initial load, filter submit, page change, or tab refocus (after 10s stale) updated the list
- **下一页** returned no rows: backend fetched only `page_size` lines from Loki, so page 2 sliced an empty range; `total` never exceeded 50 and pagination UI was hidden when `totalPages <= 1`
- Long table forced scrolling past filters to reach pagination or detail actions

## What Didn't Work

- **Pagination UI only** — frontend already had 上一页/下一页, but backend `limit = min(page_size, loki_max_lines)` meant Loki never returned enough lines for page 2+
- **Keeping `page_size: 50` without scroll cap** — fewer pages but each page still overflowed the viewport
- **Relying on `refetchOnWindowFocus` alone** — not equivalent to ops dashboards that poll every 30s (session history)

## Solution

Three coordinated fixes on `LogsPage` and `AdminLogsService`:

### 1. Auto-refresh + manual refresh (frontend)

```tsx
const { data, isLoading, error, refetch, isFetching } = useQuery({
  queryKey: ['logs', page, filters],
  queryFn: () => fetchLogs({ page, page_size: 20, /* filters */ }),
  retry: false,
  refetchInterval: (query) => {
    const err = query.state.error
    if (err instanceof ApiError && err.code === LOKI_UNAVAILABLE) return false
    return 30_000
  },
})
```

- `PageHeader` description notes **每 30 秒自动刷新**
- Toolbar **刷新** button calls `refetch()`; disabled while `isFetching` or Loki unavailable (50301)

### 2. Loki pagination (backend)

```python
# app/services/admin_logs.py — fetch enough lines once, slice in memory
limit = self.settings.loki_max_lines  # default 500
# ...
entries = self._parse_loki_response(payload)
total = len(entries)
offset = (page - 1) * page_size
page_items = entries[offset : offset + page_size]
```

- Frontend always shows pagination bar (aligned with audit logs): `第 {page} / {totalPages} 页（共 {total} 条）`
- Test: `test_logs_pagination_second_page` asserts Loki `limit == 500` and page 2 returns remaining rows

### 3. Table viewport cap (frontend)

- `page_size: 20` (matches audit/users lists)
- `DataTable` optional `scrollMaxHeight` with sticky header:

```tsx
<DataTable scrollMaxHeight="min(52vh, 24rem)" /* ... */ />
```

```css
/* DataTable.module.css */
.wrapScroll { overflow-y: auto; }
.wrapScroll .table th { position: sticky; top: 0; z-index: 1; }
```

## Why This Works

- **Refresh:** Same TanStack Query pattern as `DashboardPage` (`refetchInterval: 30_000`); stops polling when Loki is down to avoid 503 spam
- **Pagination:** Loki `query_range` `limit` caps total lines returned per request; paging must fetch up to `loki_max_lines` then offset-slice — requesting only `page_size` lines makes page N impossible for N > 1
- **Layout:** Shorter pages plus an internal scroll region keep filters, refresh, and pagination in view; complements portal-based detail modal (see related doc)

## Prevention

- When adding admin list pages backed by capped upstream queries (Loki, metrics), **never set upstream `limit` to `page_size`** unless the API supports true cursor/offset at the source
- Align list UX with existing admin pages: **20 rows/page**, optional `scrollMaxHeight` for dense tables, **30s refetch** for ops views unless data is static
- Add API test for **page 2** whenever pagination is exposed

## Related Issues

- [Admin log detail modal off-screen](../ui-bugs/admin-modal-offscreen-transform-containing-block-2026-05-19.md) — same page; portal `Modal` + table scroll cap address different viewport issues
- [Admin SPA trailing slash](../integration-issues/admin-caddy-path-without-trailing-slash-2026-05-18.md) — SPA deployment prerequisite

---
title: Admin log detail modal appears off-screen until page scroll
date: 2026-05-19
category: ui-bugs
module: admin
problem_type: ui_bug
component: tooling
symptoms:
  - "Clicking 详情 on /admin/logs opens a modal that is not visible in the viewport"
  - "User must scroll down the long log table to the middle of the page to see 日志详情"
  - "Modal backdrop may render but dialog content is far from the current scroll position"
root_cause: scope_issue
resolution_type: code_fix
severity: medium
tags:
  - admin-spa
  - modal
  - react-portal
  - position-fixed
  - css-transform
  - page-animation
  - logs-page
related_components:
  - audit-logs-page
---

# Admin log detail modal appears off-screen until page scroll

## Problem

On the admin **应用日志** page (`/admin/logs`), clicking **详情** on a log row should open a centered overlay. Instead, the dialog appeared partway down the page; users had to scroll the main content to find it.

## Symptoms

- Detail modal not centered in the browser window after clicking **详情**
- Issue more noticeable when the log table is long (many rows loaded)
- Same pattern existed on **审计日志** detail modal (`AuditLogsPage`)

## What Didn't Work

- Keeping `position: fixed` on `.modalBackdrop` inside the page component — CSS was correct in isolation but ineffective because an ancestor created a new containing block
- Relying on `align-items: center` / `justify-content: center` on the backdrop — centering was relative to the transformed page container, not the viewport

## Solution

Add a shared `Modal` component that renders via `createPortal(..., document.body)` and use it for log/audit detail dialogs.

**`admin/src/components/Modal.tsx`** (key behavior):

```tsx
import { createPortal } from 'react-dom'

export function Modal({ title, titleId, onClose, children }: ModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}
```

**Pages updated:** `LogsPage.tsx`, `AuditLogsPage.tsx` — replace inline backdrop markup with `<Modal>`.

## Why This Works

Page wrappers use `shared.module.css` `.page` with a `pageIn` animation:

```css
@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Any ancestor with a non-`none` `transform` (including post-animation `translateY(0)` when `animation-fill-mode: both`) establishes a **containing block** for `position: fixed` descendants. The modal was fixed to the tall `.page` box, not the viewport.

Portaling to `document.body` escapes that ancestor chain so `position: fixed; inset: 0` covers and centers within the viewport.

## Prevention

- **Any overlay/dialog in admin pages** should use the shared `Modal` component (or another portal to `document.body`), not inline `position: fixed` inside `.page` or `AdminLayout` content
- Long admin tables should use `DataTable` `scrollMaxHeight` (see [logs page layout doc](./admin-logs-page-refresh-pagination-layout-2026-05-19.md)) so filters and pagination stay on screen
- When adding page enter animations, avoid `transform` on persistent wrappers if they will contain modals; prefer `opacity`-only animations, or portal overlays
- Quick check: if a fixed overlay misaligns after scroll, inspect ancestors for `transform`, `filter`, `perspective`, or `will-change: transform`

## Related Issues

- [Admin SPA trailing slash routing](../integration-issues/admin-caddy-path-without-trailing-slash-2026-05-18.md) — another admin/Caddy integration note
- [Logs page refresh, Loki pagination, and table scroll cap](./admin-logs-page-refresh-pagination-layout-2026-05-19.md) — auto-refresh, pagination fix, and `scrollMaxHeight` on the same page

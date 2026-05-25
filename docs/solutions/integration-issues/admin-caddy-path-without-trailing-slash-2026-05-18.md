---
title: Admin SPA 404 when visiting /admin without trailing slash
date: 2026-05-18
category: integration-issues
module: admin
problem_type: integration_issue
component: tooling
symptoms:
  - "curl https://localhost/admin returns FastAPI JSON {\"code\":40400,\"message\":\"Not Found\"}"
  - "Browser shows API error envelope instead of React admin login page"
  - "https://localhost/admin/ returns 200 and serves index.html"
root_cause: config_error
resolution_type: config_change
severity: medium
tags:
  - caddy
  - admin-spa
  - reverse-proxy
  - trailing-slash
  - docker-compose
  - fastapi-kit
related_components:
  - documentation
---

# Admin SPA 404 when visiting /admin without trailing slash

> 同一 Caddy 配置对 **creator** 工作台对称：`@creator_exact path /creator` → 301 `/creator/`（`handle_path /creator/*`）。下文以 admin 为例。

## Problem

After deploying the admin SPA behind Caddy on `https://localhost`, users who open **`/admin`** (no trailing slash) see a FastAPI 404 JSON response instead of the management UI. The SPA works at **`/admin/`**.

## Symptoms

- `curl -s https://localhost/admin` → `{"code":40400,"message":"Not Found","data":null}`
- `curl -sk https://localhost/admin/` → HTML (`<!doctype html>...`)
- Caddy access logs show the `/admin` request handled by the default `reverse_proxy` block, not `file_server`

## What Didn't Work

- Assuming `handle_path /admin/*` also matches the exact path `/admin` — it does not; only paths under `/admin/...` are handled.
- Using `handle /admin { redir /admin/ permanent }` inside a nested `handle` block without a path matcher — produced `200` with empty body instead of a redirect in some reload orderings.
- `curl -K https://localhost/admin` — `-K` expects a config file path, not a URL (unrelated user error).

## Solution

In `docker/Caddyfile`, add explicit matchers and redirects **before** each SPA's `handle_path` block and before the API `reverse_proxy`:

```caddyfile
@admin_exact path /admin
redir @admin_exact /admin/ permanent

handle_path /admin/* {
    root * /srv/admin
    uri strip_prefix /admin
    try_files {path} /index.html
    file_server
}

@creator_exact path /creator
redir @creator_exact /creator/ permanent

handle_path /creator/* {
    root * /srv/creator
    uri strip_prefix /creator
    try_files {path} /index.html
    file_server
}
```

Reload or restart the proxy container after editing the mounted Caddyfile:

```bash
docker compose restart proxy
```

Verify:

```bash
curl -skI https://localhost/admin
# HTTP/1.1 301 Moved Permanently
# Location: /admin/

curl -skL https://localhost/admin | head -3
# <!doctype html>...
```

## Why This Works

Caddy evaluates `handle` blocks in order. `handle_path /admin/*` only matches requests whose path continues after `/admin/` (e.g. `/admin/assets/...`). A request to exactly `/admin` does not match, so it falls through to the catch-all `handle { reverse_proxy ... }`, which forwards to FastAPI. FastAPI has no route for `/admin`, hence `40400`.

The `@admin_exact` matcher catches the bare path and issues a **301** to `/admin/`, where `file_server` + `try_files` serve the Vite-built SPA (`base: '/admin/'` in `admin/vite.config.ts`).

## Prevention

- Document the canonical URLs as **`https://localhost/admin/`** and **`https://localhost/creator/`** (see `AGENTS.md`).
- When adding new path-mounted SPAs in Caddy, always add an explicit redirect for the non-trailing-slash variant if the app uses a `base` with a trailing slash (`admin/vite.config.ts` and `creator/vite.config.ts` both use trailing-slash bases).
- Smoke test both URLs after proxy changes:

  ```bash
  curl -sk -o /dev/null -w "%{http_code} %{redirect_url}\n" https://localhost/admin
  curl -sk -o /dev/null -w "%{http_code}\n" https://localhost/admin/
  curl -sk -o /dev/null -w "%{http_code} %{redirect_url}\n" https://localhost/creator
  curl -sk -o /dev/null -w "%{http_code}\n" https://localhost/creator/
  ```

## Related Issues

- [fastapi-production-scaffold-greenfield-2026-05-16.md](../architecture-patterns/fastapi-production-scaffold-greenfield-2026-05-16.md) — overall Docker/Caddy stack; admin URL noted in project docs.

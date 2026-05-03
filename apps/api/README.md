# seo-intel API

Bun + Hono HTTP service that wraps [DataForSEO](https://dataforseo.com/) and
exposes a clean v1 API for the [`seo-intel-frontend`](../frontend/) dashboard
and any AI assistant via the (forthcoming) MCP endpoint. Background work
(competitor discovery, keyword clustering, SERP refresh) runs in a separate
BullMQ worker process backed by Redis.

The original [v1 (Cloudflare Workers + D1)](../../docs/legacy-cf-workers.md)
code is preserved on the `v1-cf-workers` tag. This v2 stack runs on
**Bun + Hono + Postgres + BullMQ** so it's deployable to plain Docker, a
Proxmox LXC, or Fly.io without a Cloudflare-specific runtime.

## Stack

| Layer | Pick |
|---|---|
| Runtime | Bun |
| Framework | Hono via `@hono/node-server` |
| Database | Postgres (any host — local docker, Fly Postgres, RDS, Supabase) |
| Background jobs | BullMQ + Redis (any host — local docker, Upstash, Fly Redis) |
| ORM seam | Routes still call a tiny D1-compatible facade (`src/lib/d1-shim.ts`) that translates `?` placeholders to `$N` and `datetime('now')` to `now()`. Drizzle is wired up for migrations and ready for incremental rewrites. |

## Local development

```bash
bun install
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, DATAFORSEO_LOGIN/PASSWORD, SEO_INTEL_API_KEY.
bun run dev          # HTTP server on :3000
bun run dev:worker   # BullMQ worker (separate terminal)
```

Smoke test: `curl http://localhost:3000/healthz` → `{"status":"ok"}`.

The whole stack (postgres + redis + api + worker) comes up with one command
from the repo root via the bundled `docker-compose.yml` — see
[`../../deploy/docker-compose.yml`](../../deploy/docker-compose.yml).

## Auth

A single bearer token guards `/api/v1/*` (configured via `SEO_INTEL_API_KEY`).
Generate one with `openssl rand -hex 32` and pass it as
`Authorization: Bearer <token>` from clients.

Public report routes under `/api/v1/reports/...` (token-based shareable
report URLs) skip the bearer check — the report token itself is the gate.

## Project layout

```
src/
├── index.ts          # HTTP entry — Hono on @hono/node-server
├── routes/           # HTTP route handlers (profiles, seo-data, intake, clusters, reports)
├── services/         # Domain logic (DataForSEO, clustering, intake pipeline, competitor discovery)
├── middleware/       # apiKeyAuth (bearer token gate)
├── lib/
│   ├── db.ts         # pg.Pool + d1-shim wrapper
│   ├── d1-shim.ts    # tiny D1-compatible facade over Postgres
│   ├── migrate.ts    # boot-time SQL runner (idempotent)
│   └── queue.ts      # BullMQ queue + Redis connection
├── workers/
│   ├── cluster-job.ts  # BullMQ processor
│   └── index.ts        # worker process entry
└── types.ts          # Env shape (DB binding + secrets)
migrations/           # *.sql, applied at boot in lex order
```

## MCP

The original MCP transport used the Cloudflare-specific `agents/mcp`
adapter. Porting to Node is a tracked TODO; the endpoint currently 501's.
Until that lands, the v1 (`v1-cf-workers`) deployment is the way to expose
SEO data to MCP clients.

## Deploy

| Target | Reference |
|---|---|
| Docker | [`../../deploy/docker-compose.yml`](../../deploy/docker-compose.yml) |
| Proxmox LXC | [`../../deploy/proxmox-lxc.md`](../../deploy/proxmox-lxc.md) |
| Fly.io | [`../../deploy/fly.md`](../../deploy/fly.md) — `cp fly.toml.example fly.toml` then edit |

The `fly.toml.example` ships the two-process layout (`app` for HTTP,
`worker` for BullMQ) on shared-CPU machines.

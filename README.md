# SEO Intel

Open-source SEO intelligence platform — keyword research, competitor analysis,
SERP tracking, Lighthouse audits, tech stack detection, client reports, and
(soon again) an MCP server for AI assistants. Powered by
[DataForSEO](https://dataforseo.com/) under the hood.

> **v2 — Bun + Hono + Postgres + BullMQ.** The original Cloudflare Workers + D1
> + Pages stack lives on the `v1-cf-workers` tag; see
> [`docs/legacy-cf-workers.md`](./docs/legacy-cf-workers.md) for context.

## Architecture

```
apps/
├── api/         # Bun + Hono service (v1 routes + BullMQ worker process)
└── frontend/    # React 19 + Vite + Tailwind 4 SPA (Caddy-served static build)

deploy/          # Docker Compose / Proxmox LXC / Fly.io recipes
```

The API is a single Bun app that runs in two process modes:
- `bun run start` — HTTP server on `:3000`
- `bun run start:worker` — BullMQ processor (no HTTP listener)

Compose, the LXC systemd units, and Fly's process groups all map cleanly to
that two-mode shape.

## Quick start (Docker)

```bash
git clone https://github.com/Logos-Flux/seo-intel.git
cd seo-intel/deploy

# Pass DataForSEO creds + a strong API key. Compose reads them as env vars.
DATAFORSEO_LOGIN='you@example.com' \
DATAFORSEO_PASSWORD='...' \
SEO_INTEL_API_KEY="$(openssl rand -hex 32)" \
docker compose up --build
```

Open <http://localhost:8080/>. The frontend is on `:8080`, the API on `:3000`,
plus a containerised Postgres on `:5432` and Redis on `:6379`.

## Per-component docs

- API: [`apps/api/README.md`](./apps/api/README.md)
- Frontend: [`apps/frontend/README.md`](./apps/frontend/README.md)

## Deploy targets

| Target | How |
|---|---|
| Docker Compose | `docker compose -f deploy/docker-compose.yml up --build` |
| Proxmox LXC | [`deploy/proxmox-lxc.md`](./deploy/proxmox-lxc.md) |
| Fly.io | [`deploy/fly.md`](./deploy/fly.md) |

## Auth (out of scope)

This repo doesn't ship app-level auth. Operators add their own — common
choices:

- **oauth2-proxy** in front of Caddy (Google / GitHub / OIDC group gate)
- **Caddy basic auth** for a quick shared passcode
- **Tailscale serve** so the SPA is only reachable from your tailnet

The API uses a single bearer token (`SEO_INTEL_API_KEY`) for service-to-service
auth. Public report URLs (`/api/v1/reports/<token>`) skip the bearer — the
report token itself is the gate.

## Features

- Multi-profile — track multiple domains from one instance
- Intake pipeline — one-click domain onboarding (discovers keywords, competitors, rankings)
- Keyword research with monthly trends + clustering
- Competitor analysis — traffic, keyword counts, backlink profiles
- Gap analysis — keywords competitors rank for that you don't
- SERP checker — live Google results
- Ranked keywords — current organic positions
- Lighthouse audits + tech stack detection
- Client reports — shareable token-based summaries

## License

[MIT](./LICENSE)

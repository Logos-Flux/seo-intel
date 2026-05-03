# seo-intel frontend

React 19 + Vite + Tailwind 4 dashboard for the [`seo-intel-api`](../api/).

Two layouts:
- **Admin** (`/`) — multi-profile dashboard for keyword research, competitors,
  gap analysis, SERP, ranked keywords, Lighthouse, tech stack, clusters.
- **Client report** (`/report/:token`) — shareable read-only summary for a
  single profile, gated by the report token (no app-level auth).

## Local development

```bash
bun install
cp .env.example .env
bun run dev          # http://localhost:5174
```

Vite proxies `/api/*` to `VITE_API_URL` (default `http://localhost:3000`).
Run `seo-intel-api` alongside, or set `VITE_API_URL` to a remote API host.

## Auth (out of scope)

The OSS build doesn't ship app-level auth. Operators add their own — common
choices:

- **oauth2-proxy** in front of Caddy, restricting access to a Google /
  GitHub / OIDC group.
- **Caddy basic auth** for a quick passcode.
- **Tailscale serve** so the SPA is only reachable from your tailnet.

Whichever you pick, the `seo-intel-api` bearer token (`SEO_INTEL_API_KEY`)
is still the auth boundary on the API itself — the frontend forwards
requests with that token via the Caddy `/api/*` proxy.

## Deploy

| Target | Reference |
|---|---|
| Docker | [`../../deploy/docker-compose.yml`](../../deploy/docker-compose.yml) |
| Proxmox LXC | [`../../deploy/proxmox-lxc.md`](../../deploy/proxmox-lxc.md) |
| Fly.io | [`../../deploy/fly.md`](../../deploy/fly.md) — `cp fly.toml.example fly.toml` then edit |

The Caddyfile reads `API_UPSTREAM` (default `http://api:3000`, the
docker-compose service name) so the same image works in compose and on
Fly. Set `API_UPSTREAM=https://your-api.fly.dev` in Fly secrets.

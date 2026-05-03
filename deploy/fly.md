# Deploy seo-intel to Fly.io

Two Fly apps — `<your-api>` for the API + worker, `<your-frontend>` for the
SPA — plus a managed Postgres cluster and a Redis instance.

## 1. Install + auth

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

## 2. Provision Postgres + Redis

```bash
# Postgres — pick a name and region; Fly returns the Connection URL.
flyctl postgres create --name <your-pg> --region iad --vm-size shared-cpu-1x --volume-size 1
# Save the Connection URL printed at the end — it goes into the API's DATABASE_URL.

# Redis — Upstash via Fly is the easiest:
flyctl redis create --name <your-redis> --org personal --region iad --plan free
flyctl redis status <your-redis>      # prints the rediss:// URL
```

(For the OSS workflow you can also point at any external Postgres /
Redis — Supabase, Neon, AWS RDS, Upstash, Redis Cloud, etc.)

## 3. Deploy the API

```bash
cd apps/api
cp fly.toml.example fly.toml
sed -i 's/<your-api-app-name>/<your-api>/' fly.toml

flyctl apps create <your-api> --org personal

flyctl secrets set \
  DATABASE_URL='postgres://...'   \
  REDIS_URL='rediss://...'         \
  DATAFORSEO_LOGIN='...'           \
  DATAFORSEO_PASSWORD='...'        \
  SEO_INTEL_API_KEY="$(openssl rand -hex 32)" \
  -a <your-api>

flyctl deploy
```

The `fly.toml.example` defines two process groups (`app` for HTTP, `worker`
for BullMQ). Fly schedules each on its own VM.

Smoke test: `curl https://<your-api>.fly.dev/healthz` → `{"status":"ok"}`.

## 4. Deploy the frontend

```bash
cd apps/frontend
cp fly.toml.example fly.toml
sed -i 's/<your-frontend-app-name>/<your-frontend>/' fly.toml

flyctl apps create <your-frontend> --org personal

# Tell Caddy where the API lives.
flyctl secrets set API_UPSTREAM='https://<your-api>.fly.dev' -a <your-frontend>

flyctl deploy
```

Open `https://<your-frontend>.fly.dev/` — the SPA should load and
`/api/*` requests should reach the API via the Caddy proxy.

## 5. Custom domain (optional)

```bash
flyctl certs add seo.example.com -a <your-frontend>
# Add CNAME at your DNS provider:
#   seo.example.com  CNAME  <your-frontend>.fly.dev
flyctl certs show seo.example.com -a <your-frontend>   # poll until status: Issued
```

If your DNS sits behind Cloudflare, the cert must be issued with the
record set to **DNS-only (gray cloud)** so Fly's TLS-ALPN-01 challenge
can reach the origin. Flip back to Proxied once `Issued`.

## 6. CI/CD

Add `FLY_API_TOKEN` (a deploy token from `flyctl tokens create deploy`) as
a repo secret and use `superfly/flyctl-actions/setup-flyctl@master` +
`flyctl deploy --remote-only -c apps/api/fly.toml` (and similar for the
frontend) in your GitHub Actions workflow.

## Cost shape

A scale-to-zero frontend on shared-CPU-1x costs essentially nothing for
low traffic. The API with `auto_stop_machines = false` + `min_machines_running = 1`
holds one machine warm so the BullMQ worker can pick up jobs at any time
— budget for ~$2-3/month per app + Postgres/Redis pricing per Fly's tiers.

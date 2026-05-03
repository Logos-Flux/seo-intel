# Deploy seo-intel to a Proxmox LXC

The simplest layout: one privileged Debian 12 LXC running everything
(postgres, redis, api, worker, frontend). Scale out by splitting any of
the services to its own LXC later — they all talk over the tailnet.

## 1. Create the container

From the Proxmox host:

```bash
pct create 210 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname seo-intel \
  --memory 1024 \
  --cores 2 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --features nesting=1,keyctl=1 \
  --start 1
```

`nesting=1` + `keyctl=1` lets us run Docker inside the LXC if you want to
shortcut the install with the bundled `deploy/docker-compose.yml` — skip
to step 2b if so.

## 2a. Native install (Bun + Postgres + Redis + Caddy on the LXC directly)

```bash
pct enter 210
apt-get update && apt-get install -y curl unzip ca-certificates gnupg \
  postgresql redis-server caddy
systemctl enable --now postgresql redis-server caddy

# Bun for build + runtime
curl -fsSL https://bun.sh/install | BUN_INSTALL=/opt/bun bash
ln -s /opt/bun/bin/bun /usr/local/bin/bun

# DB
sudo -u postgres psql -c "CREATE USER seo WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE seo OWNER seo;"

# Repo
git clone https://github.com/Logos-Flux/seo-intel.git /opt/seo-intel
cd /opt/seo-intel/apps/api
bun install --frozen-lockfile
bun run build
cp .env.example .env
# edit .env — DATABASE_URL=postgres://seo:CHANGE_ME@localhost/seo, REDIS_URL=redis://localhost:6379,
#             DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, SEO_INTEL_API_KEY=$(openssl rand -hex 32)

# systemd units (paste these into the listed files)
cat >/etc/systemd/system/seo-intel-api.service <<'UNIT'
[Unit]
Description=seo-intel API
After=postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
WorkingDirectory=/opt/seo-intel/apps/api
EnvironmentFile=/opt/seo-intel/apps/api/.env
ExecStart=/usr/local/bin/bun run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

cat >/etc/systemd/system/seo-intel-worker.service <<'UNIT'
[Unit]
Description=seo-intel BullMQ worker
After=seo-intel-api.service
Wants=seo-intel-api.service

[Service]
WorkingDirectory=/opt/seo-intel/apps/api
EnvironmentFile=/opt/seo-intel/apps/api/.env
ExecStart=/usr/local/bin/bun run start:worker
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now seo-intel-api seo-intel-worker

# Frontend (static build → Caddy)
cd /opt/seo-intel/apps/frontend
bun install --frozen-lockfile
echo "VITE_API_URL=http://127.0.0.1:3000" > .env
bun run build

install -m 644 Caddyfile /etc/caddy/Caddyfile
ln -sfn /opt/seo-intel/apps/frontend/dist /srv
systemctl restart caddy
```

The default `Caddyfile` listens on `:8080` and reverse-proxies `/api/*` to
the upstream defined by `API_UPSTREAM` (or `http://api:3000` as a fallback).
On the LXC the API runs at `127.0.0.1:3000`, so set:

```bash
echo 'API_UPSTREAM=http://127.0.0.1:3000' >> /etc/default/caddy
systemctl restart caddy
```

To serve on `:443` with a real hostname, replace the `:8080 { ... }` block
with `seo.example.com { ... }` — Caddy will provision a Let's Encrypt cert
automatically.

## 2b. Docker-in-LXC shortcut

If the LXC has nesting + keyctl enabled, install Docker normally inside
the LXC and run the bundled compose file:

```bash
pct enter 210
curl -fsSL https://get.docker.com | sh
git clone https://github.com/Logos-Flux/seo-intel.git /opt/seo-intel
cd /opt/seo-intel/deploy
DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=... SEO_INTEL_API_KEY=... \
  docker compose up -d --build
```

This is the fastest path to a working stack — at the cost of running a
container engine inside an LXC, which some operators avoid.

## Updates

Native install:

```bash
cd /opt/seo-intel
git pull
cd apps/api && bun install --frozen-lockfile && bun run build
systemctl restart seo-intel-api seo-intel-worker
cd ../frontend && bun install --frozen-lockfile && bun run build
systemctl reload caddy
```

Docker-in-LXC: `cd /opt/seo-intel/deploy && git pull && docker compose up -d --build`.

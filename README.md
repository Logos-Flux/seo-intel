# SEO Intel

Open-source SEO intelligence platform built on Cloudflare Workers + Pages. Pull keyword research, competitor analysis, SERP tracking, Lighthouse audits, and tech stack detection into a single dashboard — powered by [DataForSEO](https://dataforseo.com).

Includes an MCP server so AI assistants (Claude, etc.) can query your SEO data directly.

## Architecture

```
app/          React 19 + Vite + Tailwind 4 SPA (Cloudflare Pages)
worker/       Hono API on Cloudflare Workers (D1 database)
```

**App** — Admin dashboard at `/app`, shareable client reports at `/report/:token`.

**Worker** — REST API at `/api/v1` (API-key auth), MCP endpoint at `/mcp`.

## Features

- **Multi-profile** — track multiple domains from a single instance
- **Intake pipeline** — one-click domain onboarding: discovers keywords, competitors, rankings
- **Keyword research** — volume, difficulty, intent, CPC, monthly trends, clustering
- **Competitor analysis** — traffic, keyword counts, backlink profiles
- **Gap analysis** — find keywords competitors rank for that you don't
- **SERP checker** — live Google results for any keyword
- **Ranked keywords** — track your current organic positions
- **Lighthouse audits** — performance, accessibility, SEO, best practices scores
- **Tech stack detection** — identify technologies used by any domain
- **Client reports** — generate shareable report URLs with token-based access
- **MCP server** — 11 tools for AI assistant integration

## Prerequisites

- [Bun](https://bun.sh) (or Node.js 18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- A Cloudflare account (free tier works)
- A [DataForSEO](https://dataforseo.com) account (API access required — this is a paid service)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Logos-Flux/seo-intel.git
cd seo-intel

cd worker && bun install && cd ..
cd app && bun install && cd ..
```

### 2. Create the D1 database

```bash
cd worker
wrangler d1 create seo-intel-db
```

Copy the `database_id` from the output into `worker/wrangler.toml`.

### 3. Run migrations

```bash
cd worker
bun run db:migrate:local    # for local dev
bun run db:migrate:remote   # for production
```

### 4. Configure secrets

```bash
cd worker
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your values:

| Variable | Description |
|----------|-------------|
| `SEO_INTEL_API_KEY` | Any string — used to authenticate API requests |
| `DATAFORSEO_LOGIN` | Your DataForSEO API login |
| `DATAFORSEO_PASSWORD` | Your DataForSEO API password |

For production, set these as Cloudflare Worker secrets:

```bash
wrangler secret put SEO_INTEL_API_KEY
wrangler secret put DATAFORSEO_LOGIN
wrangler secret put DATAFORSEO_PASSWORD
```

### 5. Configure Pages environment

The app's Pages Function proxy needs two env vars set in the Cloudflare Pages dashboard:

| Variable | Description |
|----------|-------------|
| `SEO_INTEL_API_URL` | Your deployed worker URL (e.g. `https://seo-intel-api.<you>.workers.dev`) |
| `SEO_INTEL_API_KEY` | Same API key as the worker |

### 6. Run locally

```bash
# Terminal 1 — API
cd worker && bun run dev

# Terminal 2 — App
cd app && bun run dev
```

## Deploy

```bash
# Worker
cd worker && bun run deploy

# App (via Cloudflare Pages — connect the repo or use direct upload)
cd app && bun run build
wrangler pages deploy dist
```

## MCP Server

The worker exposes an MCP endpoint at `/mcp` with 11 tools:

| Tool | Description |
|------|-------------|
| `seo_intel_list_profiles` | List all company profiles |
| `seo_intel_get_profile` | Get details for a specific profile |
| `seo_intel_intake` | Run full SEO intake for a domain |
| `seo_intel_keywords` | Get keywords with volume, difficulty, intent |
| `seo_intel_competitors` | Get competitor traffic/keyword snapshots |
| `seo_intel_gaps` | Keyword gaps vs a competitor |
| `seo_intel_ranked` | Keywords the domain currently ranks for |
| `seo_intel_serp` | Live SERP results for a keyword |
| `seo_intel_lighthouse` | Lighthouse audit scores |
| `seo_intel_tech` | Detect domain tech stack |
| `seo_intel_report` | Generate shareable client report URL |

### Connect from Claude Code

Add to `.mcp.json` in your project:

```json
{
  "mcpServers": {
    "seo-intel": {
      "type": "url",
      "url": "https://your-worker.workers.dev/mcp"
    }
  }
}
```

## Cost Warning

The intake pipeline and data refresh endpoints call the DataForSEO API, which is a **paid service**. A single intake run may consume multiple API credits across keyword research, competitor discovery, SERP analysis, and domain overview endpoints. Monitor your DataForSEO usage dashboard.

## License

[MIT](LICENSE)

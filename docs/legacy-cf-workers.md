# Legacy Cloudflare Workers stack (v1)

The original `seo-intel` shipped on Cloudflare Workers + Cloudflare Pages
with D1 (SQLite) for storage. It's preserved on the **`v1-cf-workers`** tag:

```bash
git fetch --tags
git checkout v1-cf-workers
```

The v1 layout was:

```
app/      Cloudflare Pages SPA (React 19 + Vite + Tailwind 4)
worker/   Hono + agents/mcp on Cloudflare Workers, D1 for storage
```

It's still a valid choice if you prefer Cloudflare's edge-runtime + D1
ergonomics over the Bun/Postgres stack on `main`. The MCP server in
particular only ships in v1 — porting it to Node-runtime is a tracked TODO
on the v2 stack.

## Why we rebuilt

- **MCP isn't blocked any more by Cloudflare runtime quirks** — the
  Node-runtime MCP SDK covers what we need without the `agents/mcp`
  adapter, so Cloudflare-specific edge code stopped paying for itself.
- **Background jobs cleanly belong in BullMQ** instead of Durable Objects;
  v2 ships a proper `worker` process group.
- **Self-hosting** — Workers + D1 hard-codes your hosting choice. v2 runs
  on plain Docker / Proxmox / Fly so anyone can clone-and-deploy.

## Forks

If you forked v1 and have local changes, the simplest path is to keep
running the fork against `v1-cf-workers` and merge upstream tag updates;
v1 will keep getting security patches but no new features.

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type { Env } from './types'
import { db } from './lib/db'
import { runMigrations } from './lib/migrate'
import { apiKeyAuth } from './middleware/auth'
import { profileRoutes } from './routes/profiles'
import { seoDataRoutes } from './routes/seo-data'
import { intakeRoutes } from './routes/intake'
import { clusterRoutes } from './routes/clusters'
import { reportRoutes, publicReportRoutes } from './routes/reports'

const app = new Hono<{ Bindings: Env }>()

// Populate `c.env.DB` and the env values route/service code expects.
app.use('*', async (c, next) => {
	c.env.DB = db
	c.env.SEO_INTEL_API_KEY = process.env.SEO_INTEL_API_KEY ?? ''
	c.env.DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN ?? ''
	c.env.DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD ?? ''
	c.env.CF_API_GATEWAY = process.env.CF_API_GATEWAY ?? ''
	c.env.ENVIRONMENT = process.env.NODE_ENV ?? 'production'
	await next()
})

app.use('*', cors())

app.get('/', (c) =>
	c.json({
		name: 'SEO Intel API',
		version: '0.2.0',
		status: 'running',
	}),
)

app.get('/healthz', (c) => c.json({ status: 'ok' }))

// MCP — original used the Cloudflare-specific `agents/mcp` adapter. Porting
// the MCP transport to Node is a separate task; for now this 501s.
app.all('/mcp', (c) =>
	c.json({ error: 'MCP transport not yet ported for Node runtime' }, 501),
)

// Service API — requires API key
const v1 = new Hono<{ Bindings: Env }>()
v1.use('*', apiKeyAuth)
v1.route('/profiles', profileRoutes)
v1.route('/profiles/:id', seoDataRoutes)
v1.route('/profiles/:id/report', reportRoutes)
v1.route('/intake', intakeRoutes)
v1.route('/profiles/:id/clusters', clusterRoutes)

app.route('/api/v1', v1)

// Public report routes — no auth
app.route('/api/v1/reports', publicReportRoutes)

const port = Number(process.env.PORT ?? 3000)

async function main() {
	if (process.env.DATABASE_URL) {
		try {
			await runMigrations()
		} catch (err) {
			console.error('[migrate] failed:', (err as Error).message)
			process.exit(1)
		}
	} else {
		console.warn('[migrate] DATABASE_URL not set; skipping migrations')
	}

	serve({ fetch: app.fetch, port }, (info) => {
		console.log(`seo-api listening on http://localhost:${info.port}`)
	})
}

main()

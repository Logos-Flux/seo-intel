import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { apiKeyAuth } from './middleware/auth';
import { profileRoutes } from './routes/profiles';
import { seoDataRoutes } from './routes/seo-data';
import { intakeRoutes } from './routes/intake';
import { reportRoutes, publicReportRoutes } from './routes/reports';
import { createSeoIntelMcpHandler } from './mcp';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok', service: 'seo-intel-api' }));

// MCP endpoint — stateless, tools handle their own auth
app.all('/mcp', async (c) => {
  const handler = createSeoIntelMcpHandler(c.env);
  return handler(c.req.raw, c.env, c.executionCtx);
});

// Service API — requires API key
const v1 = new Hono<{ Bindings: Env }>();
v1.use('*', apiKeyAuth);
v1.route('/profiles', profileRoutes);
v1.route('/profiles/:id', seoDataRoutes);
v1.route('/profiles/:id/report', reportRoutes);
v1.route('/intake', intakeRoutes);

app.route('/api/v1', v1);

// Public report routes — no auth
app.route('/api/v1/reports', publicReportRoutes);

export default app;

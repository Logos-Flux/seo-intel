import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

export const apiKeyAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  if (token !== c.env.SEO_INTEL_API_KEY) {
    return c.json({ error: 'Invalid API key' }, 403);
  }

  await next();
});

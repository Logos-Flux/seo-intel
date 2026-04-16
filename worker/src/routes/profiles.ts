import { Hono } from 'hono';
import type { Env } from '../types';

export const profileRoutes = new Hono<{ Bindings: Env }>();

// GET /api/v1/profiles — list all
profileRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM profiles ORDER BY updated_at DESC'
  ).all();
  return c.json({ profiles: results });
});

// POST /api/v1/profiles — create
profileRoutes.post('/', async (c) => {
  const body = await c.req.json<{ name: string; domain: string; logo_url?: string }>();
  if (!body.name || !body.domain) {
    return c.json({ error: 'name and domain are required' }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO profiles (id, name, domain, logo_url) VALUES (?, ?, ?, ?)`
  ).bind(id, body.name, body.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''), body.logo_url ?? null).run();

  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first();
  return c.json({ profile }, 201);
});

// GET /api/v1/profiles/:id — get one
profileRoutes.get('/:id', async (c) => {
  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?')
    .bind(c.req.param('id')).first();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);
  return c.json({ profile });
});

// PUT /api/v1/profiles/:id — update
profileRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<{ name: string; domain: string; logo_url: string; competitors_json: string; seed_keywords_json: string }>>();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name) { fields.push('name = ?'); values.push(body.name); }
  if (body.domain) { fields.push('domain = ?'); values.push(body.domain); }
  if (body.logo_url !== undefined) { fields.push('logo_url = ?'); values.push(body.logo_url); }
  if (body.competitors_json !== undefined) { fields.push('competitors_json = ?'); values.push(body.competitors_json); }
  if (body.seed_keywords_json !== undefined) { fields.push('seed_keywords_json = ?'); values.push(body.seed_keywords_json); }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(`UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first();
  return c.json({ profile });
});

// DELETE /api/v1/profiles/:id — delete profile + all data
profileRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM intake_sessions WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM reports WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM serp_results WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM ranked_keywords WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM keyword_gaps WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM competitor_snapshots WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM keywords WHERE profile_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(id),
  ]);

  return c.json({ deleted: true });
});

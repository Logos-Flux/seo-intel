import { Hono } from 'hono';
import type { Env } from '../types';

export const reportRoutes = new Hono<{ Bindings: Env }>();

// POST /api/v1/profiles/:id/report — generate a report
reportRoutes.post('/', async (c) => {
  const profileId = c.req.param('id');
  const body = await c.req.json<{ title?: string; expires_days?: number }>().catch(() => ({}));

  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?')
    .bind(profileId).first();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const title = (body as any).title ?? `SEO Report — ${(profile as any).name}`;
  const expiresDays = (body as any).expires_days ?? 30;
  const expiresAt = new Date(Date.now() + expiresDays * 86400000).toISOString();

  await c.env.DB.prepare(`
    INSERT INTO reports (id, profile_id, token, title, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, profileId, token, title, expiresAt).run();

  return c.json({
    report_id: id,
    token,
    url: `/report/${token}`,
    expires_at: expiresAt,
  }, 201);
});

// Public report routes (no auth)
export const publicReportRoutes = new Hono<{ Bindings: Env }>();

// GET /api/v1/reports/:token — public report data
publicReportRoutes.get('/:token', async (c) => {
  const token = c.req.param('token');

  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE token = ?')
    .bind(token).first<any>();
  if (!report) return c.json({ error: 'Report not found' }, 404);

  // Check expiry
  if (report.expires_at && new Date(report.expires_at) < new Date()) {
    return c.json({ error: 'Report has expired' }, 410);
  }

  const profileId = report.profile_id;

  // Fetch all report data in parallel
  const [profile, keywords, competitors, gaps, ranked] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(profileId).first(),
    c.env.DB.prepare('SELECT * FROM keywords WHERE profile_id = ? ORDER BY search_volume DESC LIMIT 50').bind(profileId).all(),
    c.env.DB.prepare(`
      SELECT s.* FROM competitor_snapshots s
      INNER JOIN (SELECT domain, MAX(snapshotted_at) as latest FROM competitor_snapshots WHERE profile_id = ? GROUP BY domain) l
      ON s.domain = l.domain AND s.snapshotted_at = l.latest
      WHERE s.profile_id = ? ORDER BY s.organic_traffic DESC
    `).bind(profileId, profileId).all(),
    c.env.DB.prepare('SELECT * FROM keyword_gaps WHERE profile_id = ? AND our_position IS NULL ORDER BY search_volume DESC LIMIT 30').bind(profileId).all(),
    c.env.DB.prepare('SELECT * FROM ranked_keywords WHERE profile_id = ? ORDER BY position ASC LIMIT 30').bind(profileId).all(),
  ]);

  return c.json({
    report: {
      id: report.id,
      title: report.title,
      created_at: report.created_at,
      expires_at: report.expires_at,
    },
    profile,
    keywords: keywords.results,
    competitors: competitors.results,
    gaps: gaps.results,
    ranked: ranked.results,
  });
});

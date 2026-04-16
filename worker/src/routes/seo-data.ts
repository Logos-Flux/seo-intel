import { Hono } from 'hono';
import type { Env } from '../types';
import { DataForSEOClient } from '../services/dataforseo/client';

function getClient(env: Env) {
  return new DataForSEOClient({ login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD });
}

export const seoDataRoutes = new Hono<{ Bindings: Env }>();

// GET /keywords — all keywords for profile
seoDataRoutes.get('/keywords', async (c) => {
  const profileId = c.req.param('id');
  const cluster = c.req.query('cluster');

  const query = cluster
    ? 'SELECT * FROM keywords WHERE profile_id = ? AND cluster = ? ORDER BY search_volume DESC'
    : 'SELECT * FROM keywords WHERE profile_id = ? ORDER BY search_volume DESC';

  const { results } = cluster
    ? await c.env.DB.prepare(query).bind(profileId, cluster).all()
    : await c.env.DB.prepare(query).bind(profileId).all();

  // Get distinct clusters for filtering
  const { results: clusters } = await c.env.DB.prepare(
    'SELECT cluster, COUNT(*) as count FROM keywords WHERE profile_id = ? GROUP BY cluster ORDER BY count DESC'
  ).bind(profileId).all();

  return c.json({ keywords: results, clusters });
});

// GET /competitors — latest snapshots for profile
seoDataRoutes.get('/competitors', async (c) => {
  const profileId = c.req.param('id');

  const { results } = await c.env.DB.prepare(`
    SELECT s.* FROM competitor_snapshots s
    INNER JOIN (
      SELECT domain, MAX(snapshotted_at) as latest
      FROM competitor_snapshots WHERE profile_id = ? GROUP BY domain
    ) l ON s.domain = l.domain AND s.snapshotted_at = l.latest
    WHERE s.profile_id = ?
    ORDER BY s.organic_traffic DESC
  `).bind(profileId, profileId).all();

  return c.json({ competitors: results });
});

// GET /gaps/:domain — keyword gaps vs a competitor
seoDataRoutes.get('/gaps/:domain', async (c) => {
  const profileId = c.req.param('id');
  const competitorDomain = c.req.param('domain');
  const limit = Number(c.req.query('limit') ?? 50);

  // Check cache first (24h TTL)
  const { results: cached } = await c.env.DB.prepare(`
    SELECT * FROM keyword_gaps
    WHERE profile_id = ? AND competitor_domain = ?
    AND analyzed_at > datetime('now', '-24 hours')
    ORDER BY search_volume DESC LIMIT ?
  `).bind(profileId, competitorDomain, limit).all();

  if (cached.length > 0) {
    return c.json({ source: 'cache', gaps: cached });
  }

  // Fetch fresh from DataForSEO
  const profile = await c.env.DB.prepare('SELECT domain FROM profiles WHERE id = ?')
    .bind(profileId).first<{ domain: string }>();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);

  const client = getClient(c.env);
  const gaps = await client.getKeywordGap(profile.domain, competitorDomain, 2840, limit);

  // Purge old + insert fresh
  await c.env.DB.prepare('DELETE FROM keyword_gaps WHERE profile_id = ? AND competitor_domain = ?')
    .bind(profileId, competitorDomain).run();

  for (const gap of gaps) {
    await c.env.DB.prepare(`
      INSERT INTO keyword_gaps (id, profile_id, competitor_domain, keyword, competitor_position, our_position, search_volume, competition_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), profileId, competitorDomain,
      gap.keyword, gap.competitor_position, gap.our_position,
      gap.search_volume, gap.competition_level,
    ).run();
  }

  return c.json({ source: 'live', gaps });
});

// GET /serp/:keyword — live SERP results
seoDataRoutes.get('/serp/:keyword', async (c) => {
  const profileId = c.req.param('id');
  const keyword = decodeURIComponent(c.req.param('keyword'));

  const profile = await c.env.DB.prepare('SELECT domain FROM profiles WHERE id = ?')
    .bind(profileId).first<{ domain: string }>();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);

  // Check 1h cache
  const { results: cached } = await c.env.DB.prepare(`
    SELECT * FROM serp_results
    WHERE profile_id = ? AND keyword = ? AND fetched_at > datetime('now', '-1 hour')
    ORDER BY position ASC
  `).bind(profileId, keyword).all();

  if (cached.length > 0) {
    const ourResult = cached.find((r: any) => r.domain === profile.domain || r.domain === `www.${profile.domain}`);
    return c.json({ source: 'cache', keyword, our_position: (ourResult as any)?.position ?? null, results: cached });
  }

  const client = getClient(c.env);
  const results = await client.getSerpResults(keyword);

  // Store
  await c.env.DB.prepare('DELETE FROM serp_results WHERE profile_id = ? AND keyword = ?')
    .bind(profileId, keyword).run();

  for (const r of results) {
    await c.env.DB.prepare(`
      INSERT INTO serp_results (id, profile_id, keyword, position, url, title, domain)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), profileId, keyword, r.position, r.url, r.title, r.domain).run();
  }

  const ourResult = results.find((r) => r.domain === profile.domain || r.domain === `www.${profile.domain}`);
  return c.json({ source: 'live', keyword, our_position: ourResult?.position ?? null, results });
});

// GET /ranked — keywords the profile domain ranks for
seoDataRoutes.get('/ranked', async (c) => {
  const profileId = c.req.param('id');

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM ranked_keywords WHERE profile_id = ? ORDER BY position ASC'
  ).bind(profileId).all();

  return c.json({ ranked: results });
});

// GET /lighthouse — Lighthouse audit for profile domain
seoDataRoutes.get('/lighthouse', async (c) => {
  const profileId = c.req.param('id');
  const profile = await c.env.DB.prepare('SELECT domain FROM profiles WHERE id = ?')
    .bind(profileId).first<{ domain: string }>();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);

  const client = getClient(c.env);
  const result = await client.getLighthouseAudit(`https://${profile.domain}`);
  return c.json({ lighthouse: result });
});

// GET /tech — technology stack for profile domain
seoDataRoutes.get('/tech', async (c) => {
  const profileId = c.req.param('id');
  const profile = await c.env.DB.prepare('SELECT domain FROM profiles WHERE id = ?')
    .bind(profileId).first<{ domain: string }>();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);

  const client = getClient(c.env);
  const result = await client.getDomainTechnologies(profile.domain);
  return c.json(result);
});

// GET /backlinks — profile backlinks + competitor comparison
seoDataRoutes.get('/backlinks', async (c) => {
  const profileId = c.req.param('id');
  const profile = await c.env.DB.prepare('SELECT domain FROM profiles WHERE id = ?')
    .bind(profileId).first<{ domain: string }>();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);

  const client = getClient(c.env);

  // Get own backlink data
  const own = await client.getFullDomainSnapshot(profile.domain);

  // Get competitor backlink data from latest snapshots
  const { results: competitors } = await c.env.DB.prepare(`
    SELECT s.domain, s.backlinks, s.referring_domains, s.organic_traffic, s.snapshotted_at
    FROM competitor_snapshots s
    INNER JOIN (
      SELECT domain, MAX(snapshotted_at) as latest
      FROM competitor_snapshots WHERE profile_id = ? GROUP BY domain
    ) l ON s.domain = l.domain AND s.snapshotted_at = l.latest
    WHERE s.profile_id = ?
    ORDER BY s.backlinks DESC
  `).bind(profileId, profileId).all();

  return c.json({
    own: {
      domain: profile.domain,
      backlinks: own.backlinks,
      referring_domains: own.referring_domains,
      organic_traffic: own.organic_traffic,
    },
    competitors,
  });
});

// POST /refresh — force refresh all data for profile
seoDataRoutes.post('/refresh', async (c) => {
  const profileId = c.req.param('id');
  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?')
    .bind(profileId).first<{ domain: string; competitors_json: string | null }>();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);

  const client = getClient(c.env);
  const competitors: string[] = profile.competitors_json ? JSON.parse(profile.competitors_json) : [];
  const refreshed: Record<string, string> = {};

  for (const domain of competitors) {
    try {
      const snapshot = await client.getFullDomainSnapshot(domain);
      await c.env.DB.prepare(`
        INSERT INTO competitor_snapshots (id, profile_id, domain, organic_traffic, organic_keywords, paid_traffic, paid_keywords, backlinks, referring_domains)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), profileId, domain,
        snapshot.organic_traffic, snapshot.organic_keywords,
        snapshot.paid_traffic, snapshot.paid_keywords,
        snapshot.backlinks, snapshot.referring_domains,
      ).run();
      refreshed[domain] = 'ok';
    } catch (err) {
      refreshed[domain] = String(err);
    }
  }

  return c.json({ refreshed });
});

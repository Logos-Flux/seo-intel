import { Hono } from 'hono';
import type { Env } from '../types';
import { runIntakePipeline } from '../services/intake-pipeline';

export const intakeRoutes = new Hono<{ Bindings: Env }>();

// POST /api/v1/intake — create profile + run full discovery
intakeRoutes.post('/', async (c) => {
  const body = await c.req.json<{ domain: string; name: string; seed_keywords?: string[] }>();

  if (!body.domain || !body.name) {
    return c.json({ error: 'domain and name are required' }, 400);
  }

  const domain = body.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Check for existing profile (reuse if same domain)
  const existing = await c.env.DB.prepare('SELECT id FROM profiles WHERE domain = ?')
    .bind(domain).first<{ id: string }>();

  if (existing) {
    // Return existing profile summary
    const [kwCount, compCount, rankedCount, gapCount] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as c FROM keywords WHERE profile_id = ?').bind(existing.id).first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(DISTINCT domain) as c FROM competitor_snapshots WHERE profile_id = ?').bind(existing.id).first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM ranked_keywords WHERE profile_id = ?').bind(existing.id).first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM keyword_gaps WHERE profile_id = ?').bind(existing.id).first<{ c: number }>(),
    ]);

    return c.json({
      profile_id: existing.id,
      status: 'existing',
      domain,
      summary: {
        keywords_discovered: kwCount?.c ?? 0,
        competitors_found: compCount?.c ?? 0,
        ranked_keywords: rankedCount?.c ?? 0,
        gaps_found: gapCount?.c ?? 0,
      },
    });
  }

  // Create profile
  const profileId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO profiles (id, name, domain) VALUES (?, ?, ?)'
  ).bind(profileId, body.name, domain).run();

  // Run full intake pipeline (synchronous)
  const result = await runIntakePipeline(c.env, profileId, domain, body.seed_keywords);

  return c.json(result, 201);
});

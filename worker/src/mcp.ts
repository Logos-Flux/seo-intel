import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpHandler } from 'agents/mcp';
import type { Env } from './types';
import { DataForSEOClient } from './services/dataforseo/client';
import { runIntakePipeline } from './services/intake-pipeline';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function err(msg: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true as const };
}

function getClient(env: Env) {
  return new DataForSEOClient({ login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD });
}

// ─── MCP Server ──────────────────────────────────────────────────────────────

export function createSeoIntelMcpHandler(env: Env) {
  const server = new McpServer({
    name: 'seo-intel-mcp',
    version: '1.0.0',
  });

  // ─── Profiles ────────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_list_profiles',
    'List all company profiles in SEO Intel',
    {},
    async () => {
      const { results } = await env.DB.prepare('SELECT * FROM profiles ORDER BY updated_at DESC').all();
      return ok({ profiles: results });
    }
  );

  server.tool(
    'seo_intel_get_profile',
    'Get details for a specific company profile',
    {
      profile_id: z.string().describe('Profile ID'),
    },
    async ({ profile_id }) => {
      const profile = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(profile_id).first();
      if (!profile) return err('Profile not found');
      return ok({ profile });
    }
  );

  // ─── Intake ──────────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_intake',
    'Run full SEO intake for a company domain. Creates a profile, discovers ranked keywords, competitors, keyword gaps, and enriches with difficulty/intent. Takes 15-30 seconds.',
    {
      domain: z.string().describe('Company domain (e.g. "acmesolar.com")'),
      name: z.string().describe('Company name (e.g. "Acme Solar Co.")'),
      seed_keywords: z.array(z.string()).optional().describe('Optional seed keywords to expand from'),
    },
    async ({ domain, name, seed_keywords }) => {
      const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      // Check for existing profile
      const existing = await env.DB.prepare('SELECT id FROM profiles WHERE domain = ?').bind(cleanDomain).first<{ id: string }>();
      if (existing) {
        return ok({ profile_id: existing.id, status: 'existing', domain: cleanDomain, message: 'Profile already exists for this domain' });
      }

      const profileId = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO profiles (id, name, domain) VALUES (?, ?, ?)').bind(profileId, name, cleanDomain).run();

      const result = await runIntakePipeline(env, profileId, cleanDomain, seed_keywords);
      return ok(result);
    }
  );

  // ─── Keywords ────────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_keywords',
    'Get all tracked keywords for a profile with search volume, difficulty, intent, and competition data',
    {
      profile_id: z.string().describe('Profile ID'),
      cluster: z.string().optional().describe('Filter by keyword cluster name'),
    },
    async ({ profile_id, cluster }) => {
      const query = cluster
        ? 'SELECT * FROM keywords WHERE profile_id = ? AND cluster = ? ORDER BY search_volume DESC'
        : 'SELECT * FROM keywords WHERE profile_id = ? ORDER BY search_volume DESC';
      const { results } = cluster
        ? await env.DB.prepare(query).bind(profile_id, cluster).all()
        : await env.DB.prepare(query).bind(profile_id).all();
      return ok({ count: results.length, keywords: results });
    }
  );

  // ─── Competitors ─────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_competitors',
    'Get competitor snapshots for a profile — organic traffic, keywords, backlinks, referring domains',
    {
      profile_id: z.string().describe('Profile ID'),
    },
    async ({ profile_id }) => {
      const { results } = await env.DB.prepare(`
        SELECT s.* FROM competitor_snapshots s
        INNER JOIN (SELECT domain, MAX(snapshotted_at) as latest FROM competitor_snapshots WHERE profile_id = ? GROUP BY domain) l
        ON s.domain = l.domain AND s.snapshotted_at = l.latest
        WHERE s.profile_id = ? ORDER BY s.organic_traffic DESC
      `).bind(profile_id, profile_id).all();
      return ok({ count: results.length, competitors: results });
    }
  );

  // ─── Gap Analysis ────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_gaps',
    'Get keyword gaps — keywords a competitor ranks for that the profile domain does not',
    {
      profile_id: z.string().describe('Profile ID'),
      competitor_domain: z.string().describe('Competitor domain to compare against'),
      limit: z.number().optional().describe('Max results (default 50)'),
    },
    async ({ profile_id, competitor_domain, limit }) => {
      const max = limit ?? 50;
      const profile = await env.DB.prepare('SELECT domain FROM profiles WHERE id = ?').bind(profile_id).first<{ domain: string }>();
      if (!profile) return err('Profile not found');

      // Check cache
      const { results: cached } = await env.DB.prepare(`
        SELECT * FROM keyword_gaps WHERE profile_id = ? AND competitor_domain = ?
        AND analyzed_at > datetime('now', '-24 hours') ORDER BY search_volume DESC LIMIT ?
      `).bind(profile_id, competitor_domain, max).all();

      if (cached.length > 0) return ok({ source: 'cache', count: cached.length, gaps: cached });

      // Live fetch
      const client = getClient(env);
      const gaps = await client.getKeywordGap(profile.domain, competitor_domain, 2840, max);

      await env.DB.prepare('DELETE FROM keyword_gaps WHERE profile_id = ? AND competitor_domain = ?').bind(profile_id, competitor_domain).run();
      for (const gap of gaps) {
        await env.DB.prepare(`INSERT INTO keyword_gaps (id, profile_id, competitor_domain, keyword, competitor_position, our_position, search_volume, competition_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), profile_id, competitor_domain, gap.keyword, gap.competitor_position, gap.our_position, gap.search_volume, gap.competition_level).run();
      }

      return ok({ source: 'live', count: gaps.length, gaps });
    }
  );

  // ─── Ranked Keywords ─────────────────────────────────────────────────────

  server.tool(
    'seo_intel_ranked',
    'Get keywords the profile domain currently ranks for in Google, with position and search volume',
    {
      profile_id: z.string().describe('Profile ID'),
    },
    async ({ profile_id }) => {
      const { results } = await env.DB.prepare('SELECT * FROM ranked_keywords WHERE profile_id = ? ORDER BY position ASC').bind(profile_id).all();
      return ok({ count: results.length, ranked: results });
    }
  );

  // ─── SERP Checker ────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_serp',
    'Check live Google SERP results for a keyword, showing who ranks and at what position',
    {
      profile_id: z.string().describe('Profile ID'),
      keyword: z.string().describe('Keyword to check SERP for'),
    },
    async ({ profile_id, keyword }) => {
      const profile = await env.DB.prepare('SELECT domain FROM profiles WHERE id = ?').bind(profile_id).first<{ domain: string }>();
      if (!profile) return err('Profile not found');

      const client = getClient(env);
      const results = await client.getSerpResults(keyword);
      const ourResult = results.find((r) => r.domain === profile.domain || r.domain === `www.${profile.domain}`);

      return ok({ keyword, our_position: ourResult?.position ?? null, results });
    }
  );

  // ─── Lighthouse ──────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_lighthouse',
    'Run a Lighthouse audit for the profile domain — performance, accessibility, best practices, SEO scores plus Core Web Vitals. Takes 10-15 seconds.',
    {
      profile_id: z.string().describe('Profile ID'),
    },
    async ({ profile_id }) => {
      const profile = await env.DB.prepare('SELECT domain FROM profiles WHERE id = ?').bind(profile_id).first<{ domain: string }>();
      if (!profile) return err('Profile not found');

      const client = getClient(env);
      const result = await client.getLighthouseAudit(`https://${profile.domain}`);
      return ok({ lighthouse: result });
    }
  );

  // ─── Tech Stack ──────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_tech',
    'Detect the technology stack for the profile domain — CMS, analytics, CDN, frameworks, etc.',
    {
      profile_id: z.string().describe('Profile ID'),
    },
    async ({ profile_id }) => {
      const profile = await env.DB.prepare('SELECT domain FROM profiles WHERE id = ?').bind(profile_id).first<{ domain: string }>();
      if (!profile) return err('Profile not found');

      const client = getClient(env);
      const result = await client.getDomainTechnologies(profile.domain);
      return ok(result);
    }
  );

  // ─── Report ──────────────────────────────────────────────────────────────

  server.tool(
    'seo_intel_report',
    'Generate a shareable client report with a unique URL. Returns a token-based link that can be shared without authentication.',
    {
      profile_id: z.string().describe('Profile ID'),
      title: z.string().optional().describe('Report title (auto-generated if omitted)'),
      expires_days: z.number().optional().describe('Days until report expires (default 30)'),
    },
    async ({ profile_id, title, expires_days }) => {
      const profile = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(profile_id).first<any>();
      if (!profile) return err('Profile not found');

      const id = crypto.randomUUID();
      const token = crypto.randomUUID();
      const reportTitle = title ?? `SEO Report — ${profile.name}`;
      const days = expires_days ?? 30;
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

      await env.DB.prepare('INSERT INTO reports (id, profile_id, token, title, expires_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, profile_id, token, reportTitle, expiresAt).run();

      return ok({
        report_id: id,
        token,
        url: `https://seo-intel.pages.dev/report/${token}`,
        expires_at: expiresAt,
      });
    }
  );

  return createMcpHandler(server);
}

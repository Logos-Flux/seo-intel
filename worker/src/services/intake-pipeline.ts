import type { Env, IntakeSummary } from '../types';
import { DataForSEOClient } from './dataforseo/client';
import { clusterKeywords } from './clustering';

// Generic domains that appear in SERPs for everything — not real competitors
const DOMAIN_BLOCKLIST = new Set([
  'reddit.com', 'www.reddit.com',
  'wikipedia.org', 'en.wikipedia.org',
  'youtube.com', 'www.youtube.com',
  'amazon.com', 'www.amazon.com',
  'facebook.com', 'www.facebook.com',
  'instagram.com', 'www.instagram.com',
  'twitter.com', 'x.com',
  'linkedin.com', 'www.linkedin.com',
  'pinterest.com', 'www.pinterest.com',
  'tiktok.com', 'www.tiktok.com',
  'quora.com', 'www.quora.com',
  'yelp.com', 'www.yelp.com',
  'ebay.com', 'www.ebay.com',
  'walmart.com', 'www.walmart.com',
  'homedepot.com', 'www.homedepot.com',
  'lowes.com', 'www.lowes.com',
  'target.com', 'www.target.com',
  'nytimes.com', 'www.nytimes.com',
  'forbes.com', 'www.forbes.com',
  'healthline.com', 'www.healthline.com',
  'webmd.com', 'www.webmd.com',
  'medium.com',
  'support.google.com', 'google.com', 'www.google.com',
  'apple.com', 'www.apple.com',
  'microsoft.com', 'www.microsoft.com',
]);

export async function runIntakePipeline(
  env: Env,
  profileId: string,
  domain: string,
  seedKeywords?: string[]
): Promise<IntakeSummary> {
  const client = new DataForSEOClient({ login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD });
  const sessionId = crypto.randomUUID();

  const updateStep = async (step: string, data?: { keywords?: string; competitors?: string }) => {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO intake_sessions (id, profile_id, step, status, discovered_keywords_json, discovered_competitors_json)
       VALUES (?, ?, ?, 'in_progress', ?, ?)`
    ).bind(sessionId, profileId, step, data?.keywords ?? null, data?.competitors ?? null).run();
  };

  // Step 1: Discover ranked keywords
  await updateStep('discovering_ranked');
  const ranked = await client.getRankedKeywords(domain, 2840, 100);

  // Store ranked keywords
  for (const r of ranked) {
    await env.DB.prepare(`
      INSERT OR REPLACE INTO ranked_keywords (id, profile_id, keyword, position, url, search_volume, difficulty, intent)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
    `).bind(crypto.randomUUID(), profileId, r.keyword, r.position, r.url, r.search_volume).run();
  }

  // Step 2: Discover competitors via DataForSEO competitors_domain endpoint
  await updateStep('discovering_competitors');
  const topKeywords = ranked.slice(0, 5).map((r) => r.keyword);
  const discoveredCompetitors = await client.getCompetitorsDomain(domain, 2840, 20);

  // Filter out generic domains
  const competitors = discoveredCompetitors
    .filter((c) => {
      const d = c.domain.replace(/^www\./, '');
      return !DOMAIN_BLOCKLIST.has(c.domain) && !DOMAIN_BLOCKLIST.has(d);
    })
    .slice(0, 10)
    .map((c) => c.domain);

  // Update profile with competitors
  await env.DB.prepare('UPDATE profiles SET competitors_json = ? WHERE id = ?')
    .bind(JSON.stringify(competitors), profileId).run();

  // Snapshot each competitor
  for (const comp of competitors) {
    try {
      const snapshot = await client.getFullDomainSnapshot(comp);
      await env.DB.prepare(`
        INSERT INTO competitor_snapshots (id, profile_id, domain, organic_traffic, organic_keywords, paid_traffic, paid_keywords, backlinks, referring_domains)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), profileId, comp,
        snapshot.organic_traffic, snapshot.organic_keywords,
        snapshot.paid_traffic, snapshot.paid_keywords,
        snapshot.backlinks, snapshot.referring_domains,
      ).run();
    } catch { /* skip failed competitors */ }
  }

  // Step 3: Expand keywords via suggestions
  await updateStep('expanding_keywords');
  const seeds = seedKeywords ?? topKeywords.slice(0, 3);
  const allKeywords = new Set(ranked.map((r) => r.keyword));

  for (const seed of seeds) {
    const suggestions = await client.getKeywordSuggestions(seed, 2840, 30);
    for (const s of suggestions) {
      allKeywords.add(s.keyword);
    }
    const related = await client.getRelatedKeywords(seed, 2840, 20);
    for (const r of related) {
      allKeywords.add(r.keyword);
    }
  }

  // Step 4: Get difficulty + intent for all keywords
  await updateStep('enriching_keywords');
  const kwList = [...allKeywords];

  // Batch difficulty (max 1000 per call)
  const difficultyMap = new Map<string, number | null>();
  for (let i = 0; i < kwList.length; i += 1000) {
    const batch = kwList.slice(i, i + 1000);
    const difficulties = await client.getBulkKeywordDifficulty(batch);
    for (const d of difficulties) {
      difficultyMap.set(d.keyword, d.keyword_difficulty);
    }
  }

  // Batch intent (max 1000 per call)
  const intentMap = new Map<string, string | null>();
  for (let i = 0; i < kwList.length; i += 1000) {
    const batch = kwList.slice(i, i + 1000);
    const intents = await client.getSearchIntent(batch);
    for (const item of intents) {
      intentMap.set(item.keyword, item.intent);
    }
  }

  // Get search volume for expanded keywords
  const kwData = await client.getKeywordsData(kwList);
  const kwDataMap = new Map(kwData.map((k) => [k.keyword, k]));

  // Cluster
  const clusters = clusterKeywords(kwList);

  // Store all keywords
  for (const kw of kwList) {
    const data = kwDataMap.get(kw);
    await env.DB.prepare(`
      INSERT OR REPLACE INTO keywords (id, profile_id, keyword, cluster, search_volume, difficulty, intent, competition_level, cpc, monthly_json, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      crypto.randomUUID(), profileId, kw,
      clusters.get(kw) ?? 'other',
      data?.search_volume ?? null,
      difficultyMap.get(kw) ?? null,
      intentMap.get(kw) ?? null,
      data?.competition_level ?? null,
      data?.cpc ?? null,
      data?.monthly_searches ? JSON.stringify(data.monthly_searches) : null,
    ).run();
  }

  // Update profile with seed keywords
  await env.DB.prepare('UPDATE profiles SET seed_keywords_json = ? WHERE id = ?')
    .bind(JSON.stringify(seeds), profileId).run();

  // Step 5: Gap analysis against top competitors
  await updateStep('analyzing_gaps');
  let totalGaps = 0;
  for (const comp of competitors.slice(0, 5)) {
    try {
      const gaps = await client.getKeywordGap(domain, comp, 2840, 50);
      for (const gap of gaps) {
        await env.DB.prepare(`
          INSERT INTO keyword_gaps (id, profile_id, competitor_domain, keyword, competitor_position, our_position, search_volume, competition_level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), profileId, comp,
          gap.keyword, gap.competitor_position, gap.our_position,
          gap.search_volume, gap.competition_level,
        ).run();
      }
      totalGaps += gaps.length;
    } catch { /* skip failed gap analysis */ }
  }

  // Mark complete
  await updateStep('complete', {
    keywords: JSON.stringify(kwList.length),
    competitors: JSON.stringify(competitors),
  });

  await env.DB.prepare("UPDATE intake_sessions SET status = 'complete' WHERE id = ?")
    .bind(sessionId).run();

  return {
    profile_id: profileId,
    status: 'complete',
    domain,
    summary: {
      keywords_discovered: kwList.length,
      competitors_found: competitors.length,
      ranked_keywords: ranked.length,
      gaps_found: totalGaps,
    },
  };
}

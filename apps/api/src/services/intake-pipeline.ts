import type { Env, IntakeSummary } from '../types';
import { DataForSEOClient } from './dataforseo/client';
import { clusterKeywords } from './clustering';
import { discoverCompetitors, enrichAndStoreCompetitors } from './competitor-discovery';
import { enqueueClusterJob, clusterJobQueue } from '../lib/queue';

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
  // Job boards / content farms / mega-portals
  'indeed.com', 'www.indeed.com',
  'glassdoor.com', 'www.glassdoor.com',
  'ziprecruiter.com', 'www.ziprecruiter.com',
  'monster.com', 'www.monster.com',
  'entrepreneur.com', 'www.entrepreneur.com',
  'inc.com', 'www.inc.com',
  'businessinsider.com', 'www.businessinsider.com',
  'fastcompany.com', 'www.fastcompany.com',
  'score.org', 'www.score.org',
  'sba.gov', 'www.sba.gov',
  'investopedia.com', 'www.investopedia.com',
  'hubspot.com', 'www.hubspot.com', 'blog.hubspot.com',
  'shopify.com', 'www.shopify.com',
  'etsy.com', 'www.etsy.com',
  'alibaba.com', 'www.alibaba.com',
  'aliexpress.com', 'www.aliexpress.com',
  'fastercapital.com', 'www.fastercapital.com',
  'wix.com', 'www.wix.com',
  'squarespace.com', 'www.squarespace.com',
  'wordpress.com', 'www.wordpress.com',
  'fiverr.com', 'www.fiverr.com',
  'upwork.com', 'www.upwork.com',
]);

// Filter: competitor must be roughly comparable in size (not 1000x bigger)
function isComparableCompetitor(targetTraffic: number, compTraffic: number | null): boolean {
  if (!compTraffic || !targetTraffic) return true; // can't filter without data
  const ratio = compTraffic / Math.max(targetTraffic, 1);
  return ratio < 500; // reject if >500x our traffic
}

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
      `INSERT INTO intake_sessions (id, profile_id, step, status, discovered_keywords_json, discovered_competitors_json)
       VALUES (?, ?, ?, 'in_progress', ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         profile_id = EXCLUDED.profile_id,
         step = EXCLUDED.step,
         status = EXCLUDED.status,
         discovered_keywords_json = EXCLUDED.discovered_keywords_json,
         discovered_competitors_json = EXCLUDED.discovered_competitors_json`
    ).bind(sessionId, profileId, step, data?.keywords ?? null, data?.competitors ?? null).run();
  };

  // Step 1: Discover ranked keywords
  await updateStep('discovering_ranked');
  const ranked = await client.getRankedKeywords(domain, 2840, 100);

  // Store ranked keywords
  for (const r of ranked) {
    await env.DB.prepare(`
      INSERT INTO ranked_keywords (id, profile_id, keyword, position, url, search_volume, difficulty, intent)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
      ON CONFLICT (profile_id, keyword) DO UPDATE SET
        position = EXCLUDED.position,
        url = EXCLUDED.url,
        search_volume = EXCLUDED.search_volume,
        fetched_at = now()
    `).bind(crypto.randomUUID(), profileId, r.keyword, r.position, r.url, r.search_volume).run();
  }

  // Enrich ranked keywords with difficulty + intent
  const rankedKws = ranked.map((r) => r.keyword);
  try {
    const difficulties = await client.getBulkKeywordDifficulty(rankedKws);
    for (const d of difficulties) {
      if (d.keyword_difficulty != null) {
        await env.DB.prepare('UPDATE ranked_keywords SET difficulty = ? WHERE profile_id = ? AND keyword = ?')
          .bind(d.keyword_difficulty, profileId, d.keyword).run();
      }
    }
  } catch { /* continue */ }

  try {
    const intents = await client.getSearchIntent(rankedKws);
    for (const i of intents) {
      if (i.intent) {
        await env.DB.prepare('UPDATE ranked_keywords SET intent = ? WHERE profile_id = ? AND keyword = ?')
          .bind(i.intent, profileId, i.keyword).run();
      }
    }
  } catch { /* continue */ }

  const competitors: string[] = [];

  // Step 3: Expand keywords via suggestions
  await updateStep('expanding_keywords');
  const seeds = seedKeywords ?? ranked.slice(0, 3).map(r => r.keyword);
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

  // Batch difficulty (max 1000 per call) — non-fatal if it fails
  const difficultyMap = new Map<string, number | null>();
  try {
    for (let i = 0; i < kwList.length; i += 1000) {
      const batch = kwList.slice(i, i + 1000);
      const difficulties = await client.getBulkKeywordDifficulty(batch);
      for (const d of difficulties) {
        difficultyMap.set(d.keyword, d.keyword_difficulty);
      }
    }
  } catch { /* DataForSEO bulk difficulty can 500 — continue without it */ }

  // Batch intent (max 1000 per call) — non-fatal if it fails
  const intentMap = new Map<string, string | null>();
  try {
    for (let i = 0; i < kwList.length; i += 1000) {
      const batch = kwList.slice(i, i + 1000);
      const intents = await client.getSearchIntent(batch);
      for (const item of intents) {
        intentMap.set(item.keyword, item.intent);
      }
    }
  } catch { /* continue without intent data */ }

  // Get search volume for expanded keywords
  let kwDataMap = new Map<string, any>();
  try {
    const kwData = await client.getKeywordsData(kwList);
    kwDataMap = new Map(kwData.map((k) => [k.keyword, k]));
  } catch { /* continue without volume data */ }

  // Cluster
  const clusters = clusterKeywords(kwList);

  // Store all keywords
  for (const kw of kwList) {
    const data = kwDataMap.get(kw);
    await env.DB.prepare(`
      INSERT INTO keywords (id, profile_id, keyword, cluster, search_volume, difficulty, intent, competition_level, cpc, monthly_json, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
      ON CONFLICT (profile_id, keyword) DO UPDATE SET
        cluster = EXCLUDED.cluster,
        search_volume = EXCLUDED.search_volume,
        difficulty = EXCLUDED.difficulty,
        intent = EXCLUDED.intent,
        competition_level = EXCLUDED.competition_level,
        cpc = EXCLUDED.cpc,
        monthly_json = EXCLUDED.monthly_json,
        fetched_at = now()
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

  // Run initial Lighthouse audit (non-fatal)
  try {
    const lhResult = await client.getLighthouseAudit(`https://${domain}`);
    if (lhResult) {
      await env.DB.prepare(
        'INSERT INTO lighthouse_audits (id, profile_id, data_json) VALUES (?, ?, ?)'
      ).bind(crypto.randomUUID(), profileId, JSON.stringify(lhResult)).run();
    }
  } catch { /* continue — lighthouse is optional */ }

  // Discover and enrich competitors via AI (non-fatal)
  let competitorsFound = 0;
  if (env.CF_API_GATEWAY) {
    try {
      await updateStep('discovering_competitors');
      const rankedForPrompt = ranked.slice(0, 20).map((r) => ({ keyword: r.keyword, position: r.position }));
      const topKwsForPrompt = kwList.filter((kw) => {
        const t = kwDataMap.get(kw);
        return t && (t.search_volume ?? 0) > 0;
      }).slice(0, 20);

      const discovered = await discoverCompetitors(
        seedKeywords?.[0] ?? domain, domain,
        rankedForPrompt, topKwsForPrompt, seeds,
        env.CF_API_GATEWAY
      );

      const verifiedDomains = discovered.filter((c) => c.verified).map((c) => c.domain);
      if (verifiedDomains.length > 0) {
        await enrichAndStoreCompetitors(profileId, verifiedDomains, env.DB, client);
        competitorsFound = verifiedDomains.length;
      }
    } catch { /* continue — competitors are optional */ }
  }

  // Kick off clusters for top 3 seed keywords via BullMQ (fire-and-forget).
  // The worker process consumes the queue; intake doesn't wait for them.
  if (clusterJobQueue) {
    try {
      const clusterSeeds = seeds.slice(0, 3);
      for (const seed of clusterSeeds) {
        const jobId = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO keyword_clusters (id, profile_id, seed_keyword, similarity_threshold) VALUES (?, ?, ?, ?)'
        ).bind(jobId, profileId, seed, 0.75).run();
        enqueueClusterJob({ jobId, profileId, seed, threshold: 0.75 }).catch(() => {});
      }
    } catch { /* continue — clusters are optional */ }
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
      competitors_found: competitorsFound,
      ranked_keywords: ranked.length,
      gaps_found: 0,
    },
  };
}

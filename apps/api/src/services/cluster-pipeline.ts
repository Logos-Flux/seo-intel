import { DataForSEOClient } from './dataforseo/client';
import type { D1Compat } from '../lib/d1-shim';

const QUESTION_WORDS = new Set(['what', 'how', 'why', 'when', 'where', 'which', 'who', 'is', 'can', 'does']);

const AI_GATEWAY_URL = 'https://gateway.ai.cloudflare.com/v1/da428703889b8aae0baf5fd8acafcdd5/research-gateway/compat/chat/completions';
const AI_MODEL = 'google-ai-studio/gemini-2.5-flash';

export interface ClusterTerm {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition_level: string | null;
  keyword_difficulty: number | null;
  search_intent: string | null;
  word_count: number;
  is_question: boolean;
}

export interface ClusterGroup {
  main_keyword: string;
  terms: (ClusterTerm & { tier: 'main' | 'category' | 'long_tail' })[];
  total_volume: number;
  avg_difficulty: number;
  avg_cpc: number;
}

interface PipelineEnv {
  DB: D1Compat;
  DATAFORSEO_LOGIN: string;
  DATAFORSEO_PASSWORD: string;
  CF_API_GATEWAY: string;
}

type StatusUpdater = (status: string) => Promise<void>;

// ─── LLM Category Discovery ────────────────────────────────────────────────

interface LLMCategory {
  head_keyword: string;
  related_keywords: string[];
}

async function discoverCategories(seed: string, cfApiGateway: string): Promise<LLMCategory[]> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'cf-aig-authorization': `Bearer ${cfApiGateway}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an SEO keyword research expert. Given a seed keyword, identify related keyword clusters.

Return ONLY a JSON array. No markdown, no explanation, no code blocks.

Each entry must be:
{
  "head_keyword": "a real 1-3 word search term people type into Google",
  "related_keywords": ["real search query 1", "real search query 2", ...]
}

CRITICAL RULES:
- The "head_keyword" MUST be a real search term with actual Google search volume. NOT a category label.
  BAD: "strategy & planning", "tools & software", "roles & teams"
  GOOD: "product strategy", "product management tools", "product manager"
- Every keyword (head and related) must be something a real person would type into Google search.
- related_keywords should be 4-8 specific search queries related to the head_keyword.
- Include a mix: "how to X", "best X", "X vs Y", "X examples", "X for startups" etc.
- Return 8-12 clusters.
- Do NOT repeat the seed keyword as a head_keyword.
- Do NOT use ampersands, slashes, or category-style labels. Use plain search terms.`,
        },
        {
          role: 'user',
          content: `I am building keyword clusters around "${seed}". What are the related head keywords and their search queries?`,
        },
      ],
      temperature: 0.2,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`AI Gateway error ${response.status}: ${text.slice(0, 300)}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`AI Gateway returned invalid JSON: ${text.slice(0, 300)}`);
  }

  const content = data.choices?.[0]?.message?.content ?? '[]';
  const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

  let categories: LLMCategory[];
  try {
    categories = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse LLM categories: ${cleaned.slice(0, 300)}`);
  }

  return categories;
}

// ─── DataForSEO Expansion ───────────────────────────────────────────────────

async function expandHeadKeyword(
  headKeyword: string,
  client: DataForSEOClient
): Promise<string[]> {
  const keywords = new Set<string>();
  keywords.add(headKeyword.toLowerCase());

  const [suggestions, related] = await Promise.allSettled([
    client.getKeywordSuggestions(headKeyword, 2840, 20),
    client.getRelatedKeywords(headKeyword, 2840, 15),
  ]);

  if (suggestions.status === 'fulfilled') {
    for (const s of suggestions.value) keywords.add(s.keyword);
  }
  if (related.status === 'fulfilled') {
    for (const r of related.value) keywords.add(r.keyword);
  }

  return [...keywords];
}

// ─── Enrichment ─────────────────────────────────────────────────────────────

async function enrichKeywords(keywords: string[], client: DataForSEOClient): Promise<Map<string, ClusterTerm>> {
  const terms = new Map<string, ClusterTerm>();

  for (const kw of keywords) {
    const words = kw.split(/\s+/);
    terms.set(kw, {
      keyword: kw,
      search_volume: null,
      cpc: null,
      competition_level: null,
      keyword_difficulty: null,
      search_intent: null,
      word_count: words.length,
      is_question: QUESTION_WORDS.has(words[0]?.toLowerCase() ?? ''),
    });
  }

  try {
    for (let i = 0; i < keywords.length; i += 1000) {
      const batch = keywords.slice(i, i + 1000);
      const data = await client.getKeywordsData(batch);
      for (const d of data) {
        const t = terms.get(d.keyword);
        if (t) {
          t.search_volume = d.search_volume;
          t.cpc = d.cpc;
          t.competition_level = d.competition_level;
        }
      }
    }
  } catch { /* continue */ }

  try {
    for (let i = 0; i < keywords.length; i += 1000) {
      const batch = keywords.slice(i, i + 1000);
      const data = await client.getBulkKeywordDifficulty(batch);
      for (const d of data) {
        const t = terms.get(d.keyword);
        if (t) t.keyword_difficulty = d.keyword_difficulty;
      }
    }
  } catch { /* continue */ }

  try {
    for (let i = 0; i < keywords.length; i += 1000) {
      const batch = keywords.slice(i, i + 1000);
      const data = await client.getSearchIntent(batch);
      for (const d of data) {
        const t = terms.get(d.keyword);
        if (t) t.search_intent = d.intent;
      }
    }
  } catch { /* continue */ }

  return terms;
}

// ─── Tier Classification ────────────────────────────────────────────────────

function classifyTiers(
  headKeyword: string,
  clusterKeywords: string[],
  terms: Map<string, ClusterTerm>
): (ClusterTerm & { tier: 'main' | 'category' | 'long_tail' })[] {
  // Filter to only keywords that have search volume data
  const withData = clusterKeywords
    .map((kw) => terms.get(kw)!)
    .filter((t) => t && t.search_volume != null && t.search_volume > 0)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0));

  if (withData.length === 0) return [];

  // Main = the head keyword if it has volume, otherwise highest volume term
  const headTerm = withData.find((t) => t.keyword === headKeyword.toLowerCase());
  const mainKeyword = headTerm ?? withData[0];

  const volumes = withData.map((t) => t.search_volume ?? 0);
  const p25 = volumes[Math.floor(volumes.length * 0.75)] ?? 0;

  return withData.map((t) => {
    let tier: 'main' | 'category' | 'long_tail';
    if (t.keyword === mainKeyword.keyword) {
      tier = 'main';
    } else if (t.word_count >= 4 || t.is_question || (t.search_volume ?? 0) <= p25) {
      tier = 'long_tail';
    } else {
      tier = 'category';
    }
    return { ...t, tier };
  });
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

export async function runClusterPipeline(
  jobId: string,
  profileId: string,
  seed: string,
  _threshold: number,
  env: PipelineEnv,
  updateStatus: StatusUpdater
): Promise<ClusterGroup[]> {
  const client = new DataForSEOClient({ login: env.DATAFORSEO_LOGIN, password: env.DATAFORSEO_PASSWORD });

  // Step 1: Ask LLM for related keyword clusters
  await updateStatus('expanding');
  const llmCategories = await discoverCategories(seed, env.CF_API_GATEWAY);

  // Step 2: Build keyword lists per cluster
  // Seed keyword gets its own group via DataForSEO expansion
  await updateStatus('enriching');
  const clusterKeywords = new Map<string, string[]>();

  // Seed group
  try {
    const seedExpanded = await expandHeadKeyword(seed, client);
    clusterKeywords.set(seed, seedExpanded);
  } catch { /* continue */ }

  // Each LLM cluster: combine head_keyword expansion + LLM-provided related_keywords
  for (const cat of llmCategories) {
    const allKws = new Set<string>();
    const head = cat.head_keyword.toLowerCase();
    allKws.add(head);

    // Add LLM-provided related keywords
    for (const kw of cat.related_keywords) {
      allKws.add(kw.toLowerCase());
    }

    // Expand the head keyword via DataForSEO
    try {
      const expanded = await expandHeadKeyword(head, client);
      for (const kw of expanded) allKws.add(kw);
    } catch { /* continue */ }

    clusterKeywords.set(head, [...allKws]);
  }

  // Step 3: Collect all unique keywords and enrich
  await updateStatus('clustering');
  const allKeywords = new Set<string>();
  for (const kws of clusterKeywords.values()) {
    for (const kw of kws) allKeywords.add(kw);
  }
  const terms = await enrichKeywords([...allKeywords], client);

  // Step 4: Build groups with tier classification
  const groups: ClusterGroup[] = [];

  for (const [headKeyword, kws] of clusterKeywords) {
    const classified = classifyTiers(headKeyword, kws, terms);
    if (classified.length === 0) continue; // skip groups with no volume data

    const mainTerm = classified.find((t) => t.tier === 'main') ?? classified[0];
    const volumes = classified.map((t) => t.search_volume ?? 0);
    const difficulties = classified.map((t) => t.keyword_difficulty ?? 0).filter((d) => d > 0);
    const cpcs = classified.map((t) => t.cpc ?? 0).filter((c) => c > 0);

    groups.push({
      main_keyword: mainTerm.keyword,
      terms: classified,
      total_volume: volumes.reduce((a, b) => a + b, 0),
      avg_difficulty: difficulties.length > 0 ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length : 0,
      avg_cpc: cpcs.length > 0 ? cpcs.reduce((a, b) => a + b, 0) / cpcs.length : 0,
    });
  }

  groups.sort((a, b) => b.total_volume - a.total_volume);

  // Step 5: Store in D1
  for (const group of groups) {
    const groupId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO keyword_cluster_groups (id, cluster_id, main_keyword, total_volume, avg_difficulty, avg_cpc, term_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(groupId, jobId, group.main_keyword, group.total_volume,
      Math.round(group.avg_difficulty * 10) / 10,
      Math.round(group.avg_cpc * 100) / 100,
      group.terms.length
    ).run();

    for (const term of group.terms) {
      await env.DB.prepare(`
        INSERT INTO keyword_cluster_terms (id, group_id, cluster_id, keyword, tier, search_volume, cpc, competition_level, keyword_difficulty, search_intent, word_count, is_question)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), groupId, jobId, term.keyword, term.tier,
        term.search_volume, term.cpc, term.competition_level,
        term.keyword_difficulty, term.search_intent, term.word_count,
        term.is_question ? 1 : 0
      ).run();
    }
  }

  return groups;
}

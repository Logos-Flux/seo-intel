import type { D1Compat } from './lib/d1-shim';

// Env shape matches what route + service code from the Cloudflare Workers
// project expects. `DB` is the D1-compat shim over pg.Pool. The DurableObject
// namespace is gone; cluster jobs go through BullMQ via `enqueueClusterJob`.
export interface Env {
  DB: D1Compat;
  SEO_INTEL_API_KEY: string;
  DATAFORSEO_LOGIN: string;
  DATAFORSEO_PASSWORD: string;
  CF_API_GATEWAY?: string; // legacy hint; unused on Node
  ENVIRONMENT: string;
}

export interface Profile {
  id: string;
  name: string;
  domain: string;
  logo_url: string | null;
  competitors_json: string | null;
  seed_keywords_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: string;
  profile_id: string;
  keyword: string;
  cluster: string | null;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  competition_level: string | null;
  cpc: number | null;
  monthly_json: string | null;
  fetched_at: string | null;
}

export interface CompetitorSnapshot {
  id: string;
  profile_id: string;
  domain: string;
  organic_traffic: number | null;
  organic_keywords: number | null;
  paid_traffic: number | null;
  paid_keywords: number | null;
  backlinks: number | null;
  referring_domains: number | null;
  snapshotted_at: string;
}

export interface KeywordGap {
  id: string;
  profile_id: string;
  competitor_domain: string;
  keyword: string;
  competitor_position: number | null;
  our_position: number | null;
  search_volume: number | null;
  competition_level: string | null;
  analyzed_at: string;
}

export interface SerpResult {
  id: string;
  profile_id: string;
  keyword: string;
  position: number;
  url: string;
  title: string;
  domain: string;
  fetched_at: string;
}

export interface RankedKeyword {
  id: string;
  profile_id: string;
  keyword: string;
  position: number;
  url: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  fetched_at: string;
}

export interface Report {
  id: string;
  profile_id: string;
  token: string;
  title: string | null;
  sections_json: string | null;
  pdf_url: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface IntakeSession {
  id: string;
  profile_id: string;
  step: string;
  status: string;
  discovered_keywords_json: string | null;
  discovered_competitors_json: string | null;
  created_at: string;
}

export interface IntakeSummary {
  profile_id: string;
  status: string;
  domain: string;
  summary: {
    keywords_discovered: number;
    competitors_found: number;
    ranked_keywords: number;
    gaps_found: number;
  };
}

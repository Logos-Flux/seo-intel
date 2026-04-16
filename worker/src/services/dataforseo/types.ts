export interface DataForSEOConfig {
  login: string;
  password: string;
}

export interface DFSKeywordData {
  keyword: string;
  search_volume: number | null;
  competition: number | null;
  competition_level: string | null;
  cpc: number | null;
  monthly_searches: { year: number; month: number; search_volume: number }[] | null;
}

export interface DFSSerpResult {
  keyword: string;
  position: number;
  url: string;
  title: string;
  domain: string;
}

export interface DFSDomainOverview {
  domain: string;
  organic_traffic: number | null;
  organic_keywords: number | null;
  paid_traffic: number | null;
  paid_keywords: number | null;
  backlinks: number | null;
  referring_domains: number | null;
}

export interface DFSKeywordGap {
  keyword: string;
  competitor_position: number;
  our_position: number | null;
  search_volume: number | null;
  competition_level: string | null;
}

export interface DFSRankedKeyword {
  keyword: string;
  position: number;
  url: string;
  search_volume: number | null;
  etv: number | null;
}

export interface DFSKeywordDifficulty {
  keyword: string;
  keyword_difficulty: number | null;
}

export interface DFSSearchIntent {
  keyword: string;
  intent: string | null; // informational | transactional | navigational | commercial
}

export interface DFSKeywordSuggestion {
  keyword: string;
  search_volume: number | null;
  competition_level: string | null;
  cpc: number | null;
  category: string | null;
}

export interface DFSCompetitorDomain {
  domain: string;
  intersections: number;
  avg_position: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
}

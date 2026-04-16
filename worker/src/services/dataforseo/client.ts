import type {
  DataForSEOConfig,
  DFSKeywordData,
  DFSSerpResult,
  DFSDomainOverview,
  DFSKeywordGap,
  DFSRankedKeyword,
  DFSKeywordDifficulty,
  DFSSearchIntent,
  DFSKeywordSuggestion,
  DFSCompetitorDomain,
} from './types';

const BASE_URL = 'https://api.dataforseo.com/v3';

export class DataForSEOClient {
  private authHeader: string;

  constructor(config: DataForSEOConfig) {
    this.authHeader = `Basic ${btoa(`${config.login}:${config.password}`)}`;
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`DataForSEO API error ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as any;

    if (json.status_code !== 20000) {
      throw new Error(`DataForSEO error: ${json.status_message}`);
    }

    return json;
  }

  // ─── Keyword Metrics ───────────────────────────────────────────────────────

  async getKeywordsData(keywords: string[], locationCode = 2840): Promise<DFSKeywordData[]> {
    const response = await this.post<any>(
      '/keywords_data/google_ads/search_volume/live',
      [{ keywords, location_code: locationCode, language_code: 'en' }]
    );

    const results: DFSKeywordData[] = [];
    for (const task of response.tasks ?? []) {
      for (const item of task.result ?? []) {
        results.push({
          keyword: item.keyword,
          search_volume: item.search_volume ?? null,
          competition: item.competition ?? null,
          competition_level: item.competition_level ?? null,
          cpc: item.cpc ?? null,
          monthly_searches: item.monthly_searches ?? null,
        });
      }
    }
    return results;
  }

  // ─── SERP ──────────────────────────────────────────────────────────────────

  async getSerpResults(keyword: string, locationCode = 2840, depth = 20): Promise<DFSSerpResult[]> {
    const response = await this.post<any>(
      '/serp/google/organic/live/advanced',
      [{ keyword, location_code: locationCode, language_code: 'en', depth, calculate_rectangles: false }]
    );

    const results: DFSSerpResult[] = [];
    for (const task of response.tasks ?? []) {
      for (const taskResult of task.result ?? []) {
        for (const item of taskResult.items ?? []) {
          if (item.type === 'organic') {
            results.push({
              keyword,
              position: item.rank_absolute,
              url: item.url,
              title: item.title,
              domain: item.domain,
            });
          }
        }
      }
    }
    return results;
  }

  // ─── Domain Overview ───────────────────────────────────────────────────────

  async getDomainOverview(domain: string, locationCode = 2840): Promise<DFSDomainOverview> {
    const response = await this.post<any>(
      '/dataforseo_labs/google/domain_rank_overview/live',
      [{ target: domain, location_code: locationCode, language_code: 'en' }]
    );

    const metrics = response.tasks?.[0]?.result?.[0]?.items?.[0]?.metrics;
    const organic = metrics?.organic;
    const paid = metrics?.paid;

    return {
      domain,
      organic_traffic: organic?.etv != null ? Math.round(organic.etv) : null,
      organic_keywords: organic?.count != null ? Math.round(organic.count) : null,
      paid_traffic: paid?.etv != null ? Math.round(paid.etv) : null,
      paid_keywords: paid?.count != null ? Math.round(paid.count) : null,
      backlinks: null,
      referring_domains: null,
    };
  }

  // ─── Backlinks ─────────────────────────────────────────────────────────────

  async getBacklinksSummary(domain: string): Promise<Pick<DFSDomainOverview, 'domain' | 'backlinks' | 'referring_domains'>> {
    const response = await this.post<any>(
      '/backlinks/summary/live',
      [{ target: domain, include_subdomains: true }]
    );

    const result = response.tasks?.[0]?.result?.[0];
    return {
      domain,
      backlinks: result?.backlinks != null ? Math.round(result.backlinks) : null,
      referring_domains: result?.referring_domains != null ? Math.round(result.referring_domains) : null,
    };
  }

  // ─── Domain Intersection (Gap Analysis) ────────────────────────────────────

  async getKeywordGap(
    ourDomain: string,
    competitorDomain: string,
    locationCode = 2840,
    limit = 50
  ): Promise<DFSKeywordGap[]> {
    const response = await this.post<any>(
      '/dataforseo_labs/google/domain_intersection/live',
      [{
        target1: competitorDomain,
        target2: ourDomain,
        intersections: false,
        location_code: locationCode,
        language_code: 'en',
        item_types: ['organic'],
        limit,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
      }]
    );

    const gaps: DFSKeywordGap[] = [];
    for (const task of response.tasks ?? []) {
      for (const item of task.result?.[0]?.items ?? []) {
        const competitorEl = item.first_domain_serp_element;
        const ourEl = item.second_domain_serp_element;
        gaps.push({
          keyword: item.keyword_data?.keyword ?? '',
          competitor_position: competitorEl?.rank_absolute ?? 99,
          our_position: ourEl?.rank_absolute ?? null,
          search_volume: item.keyword_data?.keyword_info?.search_volume ?? null,
          competition_level: item.keyword_data?.keyword_info?.competition_level ?? null,
        });
      }
    }
    return gaps;
  }

  // ─── Ranked Keywords ───────────────────────────────────────────────────────

  async getRankedKeywords(domain: string, locationCode = 2840, limit = 100): Promise<DFSRankedKeyword[]> {
    const response = await this.post<any>(
      '/dataforseo_labs/google/ranked_keywords/live',
      [{
        target: domain,
        location_code: locationCode,
        language_code: 'en',
        limit,
        order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
      }]
    );

    const results: DFSRankedKeyword[] = [];
    for (const task of response.tasks ?? []) {
      for (const item of task.result?.[0]?.items ?? []) {
        const serp = item.ranked_serp_element?.serp_item;
        results.push({
          keyword: item.keyword_data?.keyword ?? '',
          position: serp?.rank_absolute ?? 99,
          url: serp?.url ?? '',
          search_volume: item.keyword_data?.keyword_info?.search_volume ?? null,
          etv: serp?.etv ?? null,
        });
      }
    }
    return results;
  }

  // ─── Bulk Keyword Difficulty ───────────────────────────────────────────────

  async getBulkKeywordDifficulty(keywords: string[], locationCode = 2840): Promise<DFSKeywordDifficulty[]> {
    const response = await this.post<any>(
      '/dataforseo_labs/google/bulk_keyword_difficulty/live',
      [{ keywords, location_code: locationCode, language_code: 'en' }]
    );

    const results: DFSKeywordDifficulty[] = [];
    for (const task of response.tasks ?? []) {
      for (const item of task.result ?? []) {
        results.push({
          keyword: item.keyword,
          keyword_difficulty: item.keyword_difficulty ?? null,
        });
      }
    }
    return results;
  }

  // ─── Search Intent ─────────────────────────────────────────────────────────

  async getSearchIntent(keywords: string[], locationCode = 2840): Promise<DFSSearchIntent[]> {
    const response = await this.post<any>(
      '/dataforseo_labs/google/search_intent/live',
      [{ keywords, location_code: locationCode, language_code: 'en' }]
    );

    const results: DFSSearchIntent[] = [];
    for (const task of response.tasks ?? []) {
      for (const item of task.result ?? []) {
        results.push({
          keyword: item.keyword,
          intent: item.keyword_intent?.label ?? null,
        });
      }
    }
    return results;
  }

  // ─── Keyword Suggestions ───────────────────────────────────────────────────

  async getKeywordSuggestions(seedKeyword: string, locationCode = 2840, limit = 50): Promise<DFSKeywordSuggestion[]> {
    const response = await this.post<any>(
      '/dataforseo_labs/google/keyword_suggestions/live',
      [{
        keyword: seedKeyword,
        location_code: locationCode,
        language_code: 'en',
        limit,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
      }]
    );

    const results: DFSKeywordSuggestion[] = [];
    for (const task of response.tasks ?? []) {
      for (const item of task.result?.[0]?.items ?? []) {
        results.push({
          keyword: item.keyword_data?.keyword ?? '',
          search_volume: item.keyword_data?.keyword_info?.search_volume ?? null,
          competition_level: item.keyword_data?.keyword_info?.competition_level ?? null,
          cpc: item.keyword_data?.keyword_info?.cpc ?? null,
          category: item.keyword_data?.keyword_info?.categories?.[0] ?? null,
        });
      }
    }
    return results;
  }

  // ─── Related Keywords ──────────────────────────────────────────────────────

  async getRelatedKeywords(seedKeyword: string, locationCode = 2840, limit = 50): Promise<DFSKeywordSuggestion[]> {
    const response = await this.post<any>(
      '/dataforseo_labs/google/related_keywords/live',
      [{
        keyword: seedKeyword,
        location_code: locationCode,
        language_code: 'en',
        limit,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
      }]
    );

    const results: DFSKeywordSuggestion[] = [];
    for (const task of response.tasks ?? []) {
      for (const item of task.result?.[0]?.items ?? []) {
        results.push({
          keyword: item.keyword_data?.keyword ?? '',
          search_volume: item.keyword_data?.keyword_info?.search_volume ?? null,
          competition_level: item.keyword_data?.keyword_info?.competition_level ?? null,
          cpc: item.keyword_data?.keyword_info?.cpc ?? null,
          category: item.keyword_data?.keyword_info?.categories?.[0] ?? null,
        });
      }
    }
    return results;
  }

  // ─── NEW: Competitors Domain (proper competitor discovery) ──────────────

  async getCompetitorsDomain(domain: string, locationCode = 2840, limit = 10): Promise<DFSCompetitorDomain[]> {
    const response = await this.post<any>(
      '/dataforseo_labs/google/competitors_domain/live',
      [{
        target: domain,
        location_code: locationCode,
        language_code: 'en',
        limit,
        filters: ['metrics.organic.count', '>=', 10],
        order_by: ['intersections,desc'],
      }]
    );

    const results: DFSCompetitorDomain[] = [];
    for (const task of response.tasks ?? []) {
      for (const item of task.result?.[0]?.items ?? []) {
        results.push({
          domain: item.domain,
          intersections: item.intersections ?? 0,
          avg_position: item.avg_position ?? null,
          organic_keywords: item.full_domain_metrics?.organic?.count ?? null,
          organic_traffic: item.full_domain_metrics?.organic?.etv != null
            ? Math.round(item.full_domain_metrics.organic.etv) : null,
        });
      }
    }
    return results;
  }

  // ─── Full Domain Snapshot (overview + backlinks) ───────────────────────────

  async getFullDomainSnapshot(domain: string): Promise<DFSDomainOverview> {
    const [overview, backlinks] = await Promise.all([
      this.getDomainOverview(domain),
      this.getBacklinksSummary(domain),
    ]);
    return { ...overview, ...backlinks };
  }

  // ─── OnPage Lighthouse ─────────────────────────────────────────────────────

  async getLighthouseAudit(url: string): Promise<any> {
    const response = await this.post<any>(
      '/on_page/lighthouse/live/json',
      [{ url, for_mobile: true }]
    );

    const result = response.tasks?.[0]?.result?.[0];
    if (!result) return null;

    const categories = result.categories ?? {};
    const audits = result.audits ?? {};

    return {
      url,
      performance: categories.performance?.score != null ? Math.round(categories.performance.score * 100) : null,
      accessibility: categories.accessibility?.score != null ? Math.round(categories.accessibility.score * 100) : null,
      best_practices: categories['best-practices']?.score != null ? Math.round(categories['best-practices'].score * 100) : null,
      seo: categories.seo?.score != null ? Math.round(categories.seo.score * 100) : null,
      fcp: audits['first-contentful-paint']?.numericValue ?? null,
      lcp: audits['largest-contentful-paint']?.numericValue ?? null,
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      tbt: audits['total-blocking-time']?.numericValue ?? null,
      speed_index: audits['speed-index']?.numericValue ?? null,
    };
  }

  // ─── Domain Technologies ───────────────────────────────────────────────────

  async getDomainTechnologies(domain: string): Promise<any> {
    const response = await this.post<any>(
      '/domain_analytics/technologies/domain_technologies/live',
      [{ target: domain }]
    );

    const items = response.tasks?.[0]?.result?.[0]?.items ?? [];
    const technologies: { name: string; category: string; version: string | null }[] = [];

    for (const item of items) {
      for (const tech of item.technologies ?? []) {
        technologies.push({
          name: tech.name ?? '',
          category: tech.category ?? '',
          version: tech.version ?? null,
        });
      }
    }

    return { domain, technologies };
  }
}

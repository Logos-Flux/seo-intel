const API_BASE = '/api/v1';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `API error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Profiles
  listProfiles: () => apiFetch<{ profiles: any[] }>('/profiles'),
  getProfile: (id: string) => apiFetch<{ profile: any }>(`/profiles/${id}`),
  createProfile: (data: { name: string; domain: string }) =>
    apiFetch<{ profile: any }>('/profiles', { method: 'POST', body: JSON.stringify(data) }),
  deleteProfile: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/profiles/${id}`, { method: 'DELETE' }),

  // SEO Data
  getKeywords: (profileId: string, cluster?: string) =>
    apiFetch<{ keywords: any[]; clusters: any[] }>(`/profiles/${profileId}/keywords${cluster ? `?cluster=${cluster}` : ''}`),
  getCompetitors: (profileId: string) =>
    apiFetch<{ competitors: any[] }>(`/profiles/${profileId}/competitors`),
  getGaps: (profileId: string, domain: string) =>
    apiFetch<{ gaps: any[] }>(`/profiles/${profileId}/gaps/${domain}`),
  getSerp: (profileId: string, keyword: string) =>
    apiFetch<{ keyword: string; our_position: number | null; results: any[] }>(`/profiles/${profileId}/serp/${encodeURIComponent(keyword)}`),
  getRanked: (profileId: string) =>
    apiFetch<{ ranked: any[] }>(`/profiles/${profileId}/ranked`),
  getBacklinks: (profileId: string) =>
    apiFetch<{ own: any; competitors: any[] }>(`/profiles/${profileId}/backlinks`),
  getLighthouse: (profileId: string) =>
    apiFetch<{ lighthouse: any }>(`/profiles/${profileId}/lighthouse`),
  getTech: (profileId: string) =>
    apiFetch<{ domain: string; technologies: any[] }>(`/profiles/${profileId}/tech`),
  refresh: (profileId: string) =>
    apiFetch<{ refreshed: Record<string, string> }>(`/profiles/${profileId}/refresh`, { method: 'POST' }),

  // Intake
  runIntake: (data: { domain: string; name: string; seed_keywords?: string[] }) =>
    apiFetch<any>('/intake', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  generateReport: (profileId: string) =>
    apiFetch<{ report_id: string; token: string; url: string }>(`/profiles/${profileId}/report`, { method: 'POST' }),
  getPublicReport: (token: string) =>
    apiFetch<any>(`/reports/${token}`),
};

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Printer, AlertTriangle } from 'lucide-react';

interface ReportData {
  report: { id: string; title: string; created_at: string; expires_at: string };
  profile: { id: string; name: string; domain: string };
  keywords: any[];
  competitors: any[];
  gaps: any[];
  ranked: any[];
}

function difficultyVariant(d: number | null): 'success' | 'warning' | 'error' {
  if (d == null) return 'muted' as any;
  if (d <= 30) return 'success';
  if (d <= 60) return 'warning';
  return 'error';
}

function difficultyLabel(d: number | null): string {
  if (d == null) return '—';
  if (d <= 30) return 'Easy';
  if (d <= 60) return 'Med';
  return 'Hard';
}

export function ClientReport() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getPublicReport(token)
      .then((res: ReportData) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Report not found or has expired.');
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-bridge-deep flex items-center justify-center">
        <div className="text-bridge-muted text-sm font-mono animate-pulse">Loading report...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh bg-bridge-deep flex items-center justify-center">
        <div className="bridge-card rounded-xl p-10 text-center max-w-md mx-auto">
          <AlertTriangle className="w-10 h-10 text-bridge-warning mx-auto mb-4" />
          <h2 className="text-bridge-bright text-lg font-semibold mb-2">Report Unavailable</h2>
          <p className="text-bridge-muted text-sm">{error ?? 'This report could not be found or has expired.'}</p>
        </div>
      </div>
    );
  }

  const { report, profile, keywords, competitors, gaps, ranked } = data;

  // KPI calculations
  const totalTraffic = ranked.reduce((sum: number, r: any) => sum + (r.search_volume ?? 0), 0);
  const totalRanked = ranked.length;
  const totalKeywords = keywords.length;
  const opportunities = gaps.length;

  // Top 15 ranked sorted by position
  const topRanked = [...ranked].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)).slice(0, 15);

  // Top 15 gaps
  const topGaps = gaps.slice(0, 15);

  // Keyword clusters
  const clusterMap: Record<string, any[]> = {};
  for (const kw of keywords) {
    const cluster = kw.cluster ?? 'Uncategorized';
    if (!clusterMap[cluster]) clusterMap[cluster] = [];
    clusterMap[cluster].push(kw);
  }
  const clusters = Object.entries(clusterMap);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-dvh bg-bridge-deep text-bridge-text font-mono">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ── */}
        <section className="report-section rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#0f1535] via-[#1a0a2e] to-[#030c1d] border border-eva-purple/30 rounded-xl p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-eva-purple font-display text-2xl tracking-widest font-bold">VOLTAGE LABS</span>
                  <span className="h-px w-12 bg-eva-purple/40 inline-block" />
                </div>
                <p className="text-bridge-muted text-xs tracking-widest uppercase mb-6">SEO Intelligence Report</p>
                <h1 className="text-bridge-bright text-3xl font-semibold mb-1">{profile.name}</h1>
                <p className="text-eva-purple text-sm">{profile.domain}</p>
                <p className="text-bridge-muted text-xs mt-2">Generated {formatDate(report.created_at)}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="no-print flex items-center gap-2 bg-eva-purple/15 border border-eva-purple/40 rounded-md px-4 py-2 text-eva-purple text-xs hover:bg-eva-purple/25 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Save as PDF
              </button>
            </div>
          </div>
        </section>

        {/* ── KPI Strip ── */}
        <section className="report-section">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Est. Monthly Traffic', value: totalTraffic.toLocaleString(), color: 'text-bridge-info' },
              { label: 'Keywords Ranking', value: totalRanked.toLocaleString(), color: 'text-eva-green' },
              { label: 'Keywords Tracked', value: totalKeywords.toLocaleString(), color: 'text-eva-purple' },
              { label: 'Opportunities', value: opportunities.toLocaleString(), color: 'text-bridge-warning' },
            ].map((kpi) => (
              <div key={kpi.label} className="bridge-card rounded-xl p-5 text-center">
                <div className={`text-3xl font-semibold mb-1 ${kpi.color}`}>{kpi.value}</div>
                <div className="text-bridge-muted text-xs uppercase tracking-wide">{kpi.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Current Rankings ── */}
        {topRanked.length > 0 && (
          <section className="report-section bridge-card rounded-xl p-6">
            <h2 className="text-bridge-bright text-base font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-eva-green inline-block rounded-full" />
              Your Top Performing Keywords
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-bridge-border">
                    <th className="text-bridge-muted text-left py-2 pr-4 font-normal">Keyword</th>
                    <th className="text-bridge-muted text-center py-2 px-3 font-normal">Position</th>
                    <th className="text-bridge-muted text-right py-2 px-3 font-normal">Volume</th>
                    <th className="text-bridge-muted text-center py-2 pl-3 font-normal">Intent</th>
                  </tr>
                </thead>
                <tbody>
                  {topRanked.map((r: any, i: number) => (
                    <tr key={r.keyword ?? i} className="border-b border-bridge-border/30 hover:bg-bridge-hover/30">
                      <td className="text-bridge-text py-2 pr-4">{r.keyword}</td>
                      <td className="text-center py-2 px-3">
                        <Badge
                          label={`#${r.position}`}
                          variant={r.position <= 3 ? 'success' : r.position <= 10 ? 'info' : 'muted'}
                        />
                      </td>
                      <td className="text-bridge-bright text-right py-2 px-3">
                        {r.search_volume?.toLocaleString() ?? '—'}
                      </td>
                      <td className="text-center py-2 pl-3">
                        {r.intent ? (
                          <span className="text-bridge-muted capitalize">{r.intent}</span>
                        ) : (
                          <span className="text-bridge-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Competitive Landscape ── */}
        {competitors.length > 0 && (
          <section className="report-section">
            <h2 className="text-bridge-bright text-base font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-eva-purple inline-block rounded-full" />
              How You Compare
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {competitors.map((comp: any) => {
                const isClient = comp.domain === profile.domain;
                return (
                  <div
                    key={comp.domain}
                    className={`bridge-card rounded-xl p-4 ${isClient ? 'border-eva-green/50 bg-eva-green/5' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {isClient && <span className="w-2 h-2 rounded-full bg-eva-green inline-block" />}
                      <span className={`text-sm font-semibold ${isClient ? 'text-eva-green' : 'text-bridge-bright'}`}>
                        {comp.domain}
                      </span>
                      {isClient && <Badge label="You" variant="success" />}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-bridge-muted">Traffic</span>
                        <span className="text-bridge-text">{comp.traffic?.toLocaleString() ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bridge-muted">Keywords</span>
                        <span className="text-bridge-text">{comp.keywords_count?.toLocaleString() ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Opportunities / Gap Analysis ── */}
        {topGaps.length > 0 && (
          <section className="report-section bridge-card rounded-xl p-6">
            <h2 className="text-bridge-bright text-base font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-bridge-warning inline-block rounded-full" />
              Keywords You Should Target
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-bridge-border">
                    <th className="text-bridge-muted text-left py-2 pr-4 font-normal">Keyword</th>
                    <th className="text-bridge-muted text-right py-2 px-3 font-normal">Volume</th>
                    <th className="text-bridge-muted text-center py-2 px-3 font-normal">Difficulty</th>
                    <th className="text-bridge-muted text-center py-2 pl-3 font-normal">Competitor Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {topGaps.map((gap: any, i: number) => (
                    <tr key={gap.keyword ?? i} className="border-b border-bridge-border/30 hover:bg-bridge-hover/30">
                      <td className="text-bridge-warning py-2 pr-4">{gap.keyword}</td>
                      <td className="text-bridge-bright text-right py-2 px-3">
                        {gap.search_volume?.toLocaleString() ?? '—'}
                      </td>
                      <td className="text-center py-2 px-3">
                        <Badge
                          label={difficultyLabel(gap.difficulty)}
                          variant={difficultyVariant(gap.difficulty)}
                        />
                      </td>
                      <td className="text-center py-2 pl-3">
                        {gap.competitor_position != null ? (
                          <Badge label={`#${gap.competitor_position}`} variant="info" />
                        ) : (
                          <span className="text-bridge-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Keyword Clusters ── */}
        {clusters.length > 0 && (
          <section className="report-section">
            <h2 className="text-bridge-bright text-base font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-bridge-info inline-block rounded-full" />
              Keyword Map
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clusters.map(([clusterName, kws]) => (
                <div key={clusterName} className="bridge-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-bridge-bright text-xs font-semibold capitalize">{clusterName}</span>
                    <Badge label={`${kws.length} kw`} variant="muted" />
                  </div>
                  <ul className="space-y-1">
                    {kws.slice(0, 3).map((kw: any) => (
                      <li key={kw.keyword} className="text-bridge-muted text-[11px] truncate">
                        {kw.keyword}
                      </li>
                    ))}
                    {kws.length > 3 && (
                      <li className="text-bridge-muted text-[10px] opacity-60">
                        +{kws.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="report-section border-t border-bridge-border/40 pt-6 pb-4 text-center space-y-1">
          <div className="text-eva-purple font-display text-lg tracking-widest">VOLTAGE LABS</div>
          <p className="text-bridge-muted text-xs">Competitive Intelligence powered by DataForSEO</p>
          <p className="text-bridge-muted text-[10px] mt-2">
            Report ID: <span className="font-mono">{report.id}</span>
            {' · '}
            Expires: {formatDate(report.expires_at)}
          </p>
        </footer>

      </div>
    </div>
  );
}

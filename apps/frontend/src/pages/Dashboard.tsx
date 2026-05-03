import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, FileText } from 'lucide-react';

export function Dashboard() {
  const { profileId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    Promise.all([
      api.getProfile(profileId),
      api.getKeywords(profileId),
      api.getCompetitors(profileId),
      api.getRanked(profileId),
    ]).then(([profileRes, kwRes, compRes, rankedRes]) => {
      setData({ profile: profileRes.profile, keywords: kwRes.keywords, competitors: compRes.competitors, ranked: rankedRes.ranked });
      setLoading(false);
    });
  }, [profileId]);

  if (loading || !data) return <p className="text-t-muted text-sm">Loading dashboard...</p>;

  const { profile, keywords, competitors, ranked } = data;

  return (
    <PanelShell
      title="Dashboard"
      subtitle={`${profile.name} — ${profile.domain}`}
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => { api.refresh(profileId!); }}
            className="flex items-center gap-1.5 bg-t-accent-alt/15 border border-t-accent-alt/30 rounded-md px-3 py-1.5 text-t-accent-alt text-xs hover:bg-t-accent-alt/25 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
        </div>
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Tracked Keywords" value={keywords.length} accentColor="green" />
        <StatCard title="Est. Traffic" value={ranked.reduce((sum: number, r: any) => sum + (r.search_volume ?? 0), 0)} accentColor="info" />
        <StatCard title="Competitors" value={competitors.length} subtitle="tracked domains" accentColor="purple" />
        <StatCard title="Avg. Position" value={ranked.length > 0 ? (ranked.reduce((sum: number, r: any) => sum + r.position, 0) / ranked.length).toFixed(1) : '—'} subtitle={`across ${ranked.length} keywords`} accentColor="warning" />
      </div>

      {/* Two column: top keywords + top ranked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Keywords */}
        <div className="t-card rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-t-bright text-sm font-semibold">Top Keywords</h3>
            <Link to={`/${profileId}/keywords`} className="text-t-info text-[10px]">View all &rarr;</Link>
          </div>
          <div className="space-y-2">
            {keywords.slice(0, 5).map((kw: any) => (
              <div key={kw.keyword} className="flex justify-between items-center py-1.5 border-b border-t-border/30">
                <span className="text-t-text text-xs">{kw.keyword}</span>
                <div className="flex items-center gap-3">
                  <span className="text-t-bright text-xs">{kw.search_volume?.toLocaleString() ?? '—'}</span>
                  {kw.difficulty != null && (
                    <Badge
                      label={kw.difficulty <= 30 ? 'Easy' : kw.difficulty <= 60 ? 'Med' : 'Hard'}
                      variant={kw.difficulty <= 30 ? 'success' : kw.difficulty <= 60 ? 'warning' : 'error'}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Ranked */}
        <div className="t-card rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-t-bright text-sm font-semibold">Current Rankings</h3>
            <Link to={`/${profileId}/ranked`} className="text-t-info text-[10px]">View all &rarr;</Link>
          </div>
          <div className="space-y-2">
            {ranked.slice(0, 5).map((r: any) => (
              <div key={r.keyword} className="flex justify-between items-center py-1.5 border-b border-t-border/30">
                <span className="text-t-text text-xs">{r.keyword}</span>
                <div className="flex items-center gap-3">
                  <span className="text-t-bright text-xs">{r.search_volume?.toLocaleString() ?? '—'}</span>
                  <Badge label={`#${r.position}`} variant={r.position <= 3 ? 'success' : r.position <= 10 ? 'info' : 'muted'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

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

  if (loading || !data) return <p className="text-bridge-muted text-sm">Loading dashboard...</p>;

  const { profile, keywords, competitors, ranked } = data;

  return (
    <PanelShell
      title="Dashboard"
      subtitle={`${profile.name} — ${profile.domain}`}
      actions={
        <div className="flex gap-2">
          <Link to={`/app/${profileId}/reports`} className="flex items-center gap-1.5 bg-bridge-info/15 border border-bridge-info/30 rounded-md px-3 py-1.5 text-bridge-info text-xs hover:bg-bridge-info/25 transition-colors">
            <FileText className="w-3.5 h-3.5" /> Generate Report
          </Link>
          <button
            onClick={() => { api.refresh(profileId!); }}
            className="flex items-center gap-1.5 bg-eva-green/15 border border-eva-green/30 rounded-md px-3 py-1.5 text-eva-green text-xs hover:bg-eva-green/25 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
        </div>
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Tracked Keywords" value={keywords.length} subtitle={`${new Set(keywords.map((k: any) => k.cluster)).size} clusters`} accentColor="green" />
        <StatCard title="Est. Traffic" value={ranked.reduce((sum: number, r: any) => sum + (r.search_volume ?? 0), 0)} accentColor="info" />
        <StatCard title="Competitors" value={competitors.length} subtitle="tracked domains" accentColor="purple" />
        <StatCard title="Keyword Gaps" value="—" subtitle="select a competitor" accentColor="warning" />
      </div>

      {/* Two column: top keywords + top ranked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Keywords */}
        <div className="bridge-card rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-bridge-bright text-sm font-semibold">Top Keywords</h3>
            <Link to={`/app/${profileId}/keywords`} className="text-bridge-info text-[10px]">View all &rarr;</Link>
          </div>
          <div className="space-y-2">
            {keywords.slice(0, 5).map((kw: any) => (
              <div key={kw.keyword} className="flex justify-between items-center py-1.5 border-b border-bridge-border/30">
                <span className="text-bridge-text text-xs">{kw.keyword}</span>
                <div className="flex items-center gap-3">
                  <span className="text-bridge-bright text-xs">{kw.search_volume?.toLocaleString() ?? '—'}</span>
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
        <div className="bridge-card rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-bridge-bright text-sm font-semibold">Current Rankings</h3>
            <Link to={`/app/${profileId}/ranked`} className="text-bridge-info text-[10px]">View all &rarr;</Link>
          </div>
          <div className="space-y-2">
            {ranked.slice(0, 5).map((r: any) => (
              <div key={r.keyword} className="flex justify-between items-center py-1.5 border-b border-bridge-border/30">
                <span className="text-bridge-text text-xs">{r.keyword}</span>
                <div className="flex items-center gap-3">
                  <span className="text-bridge-bright text-xs">{r.search_volume?.toLocaleString() ?? '—'}</span>
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

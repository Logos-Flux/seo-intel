import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { StatCard } from '@/components/ui/StatCard';

export function Backlinks() {
  const { profileId } = useParams();
  const [data, setData] = useState<{ own: any; competitors: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    api.getBacklinks(profileId).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [profileId]);

  if (loading || !data) return <p className="text-bridge-muted text-sm">Loading backlink data...</p>;

  const { own, competitors } = data;
  const maxBacklinks = Math.max(own.backlinks ?? 0, ...competitors.map((c: any) => c.backlinks ?? 0));

  return (
    <PanelShell
      title="Backlinks"
      subtitle={`${own.domain} vs competitors`}
    >
      {/* Own stats */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Your Backlinks" value={own.backlinks ?? 0} accentColor="purple" />
        <StatCard title="Referring Domains" value={own.referring_domains ?? 0} accentColor="info" />
        <StatCard title="Est. Traffic" value={own.organic_traffic ?? 0} accentColor="green" />
      </div>

      {/* Comparison chart */}
      <div className="bridge-card rounded-lg p-4">
        <h3 className="text-bridge-bright text-sm font-semibold mb-4">Backlink Comparison</h3>
        <div className="space-y-3">
          {/* Own domain */}
          <div className="flex items-center gap-3">
            <div className="w-40 shrink-0 truncate">
              <span className="text-eva-green text-xs font-semibold">{own.domain}</span>
              <span className="text-bridge-muted text-[10px] ml-1">(you)</span>
            </div>
            <div className="flex-1 h-6 bg-bridge-surface rounded-md overflow-hidden">
              <div
                className="h-full bg-eva-purple/40 rounded-md flex items-center px-2"
                style={{ width: `${maxBacklinks ? Math.max(((own.backlinks ?? 0) / maxBacklinks) * 100, 2) : 0}%` }}
              >
                <span className="text-bridge-bright text-[10px] font-medium whitespace-nowrap">
                  {(own.backlinks ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="w-24 text-right shrink-0">
              <span className="text-bridge-muted text-[10px]">{(own.referring_domains ?? 0).toLocaleString()} ref</span>
            </div>
          </div>

          {/* Competitors */}
          {competitors.map((comp: any) => (
            <div key={comp.domain} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate">
                <span className="text-bridge-text text-xs">{comp.domain}</span>
              </div>
              <div className="flex-1 h-6 bg-bridge-surface rounded-md overflow-hidden">
                <div
                  className="h-full bg-bridge-info/30 rounded-md flex items-center px-2"
                  style={{ width: `${maxBacklinks ? Math.max(((comp.backlinks ?? 0) / maxBacklinks) * 100, 2) : 0}%` }}
                >
                  <span className="text-bridge-bright text-[10px] font-medium whitespace-nowrap">
                    {(comp.backlinks ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-24 text-right shrink-0">
                <span className="text-bridge-muted text-[10px]">{(comp.referring_domains ?? 0).toLocaleString()} ref</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table view */}
      <div className="bridge-card rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-bridge-border bg-bridge-surface/50">
              <th className="text-left text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Domain</th>
              <th className="text-right text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Backlinks</th>
              <th className="text-right text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Ref. Domains</th>
              <th className="text-right text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Est. Traffic</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-bridge-border/30 bg-eva-green/5">
              <td className="px-4 py-3">
                <span className="text-eva-green font-semibold">{own.domain}</span>
                <span className="text-bridge-muted text-[10px] ml-1">(you)</span>
              </td>
              <td className="px-4 py-3 text-right text-bridge-bright">{(own.backlinks ?? 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-bridge-text">{(own.referring_domains ?? 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-bridge-text">{(own.organic_traffic ?? 0).toLocaleString()}</td>
            </tr>
            {competitors.map((comp: any) => (
              <tr key={comp.domain} className="border-b border-bridge-border/30 hover:bg-bridge-hover/30">
                <td className="px-4 py-3 text-bridge-bright">{comp.domain}</td>
                <td className="px-4 py-3 text-right text-bridge-text">{(comp.backlinks ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-bridge-text">{(comp.referring_domains ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-bridge-text">{(comp.organic_traffic ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

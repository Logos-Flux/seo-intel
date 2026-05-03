import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { Badge } from '@/components/ui/Badge';
import { Network, Plus, Download, Trash2, Loader, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_BADGES: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'muted' }> = {
  pending: { label: 'Pending', variant: 'muted' },
  expanding: { label: 'Expanding', variant: 'info' },
  enriching: { label: 'Enriching', variant: 'info' },
  embedding: { label: 'Embedding', variant: 'info' },
  clustering: { label: 'Clustering', variant: 'warning' },
  complete: { label: 'Complete', variant: 'success' },
  error: { label: 'Error', variant: 'error' },
};

function ClusterDetail({ profileId, clusterId }: { profileId: string; clusterId: string }) {
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getCluster(profileId, clusterId).then(setData);
  }, [profileId, clusterId]);

  if (!data) return <p className="text-t-muted text-sm p-4">Loading...</p>;

  const toggleGroup = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {data.groups.map((group: any) => {
        const isOpen = expanded.has(group.id);

        return (
          <div key={group.id} className="t-card rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-t-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-t-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-t-muted" />}
                <span className="text-t-bright text-sm font-semibold">{group.main_keyword}</span>
                <span className="text-t-muted text-[10px]">{group.term_count} terms</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-t-muted">
                <span>Vol: {group.total_volume?.toLocaleString()}</span>
                <span>KD: {group.avg_difficulty?.toFixed(0)}</span>
                <span>CPC: ${group.avg_cpc?.toFixed(2)}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-t-border/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-t-muted text-[9px] uppercase tracking-wider">
                      <th className="text-left font-normal px-4 py-2 w-8">Tier</th>
                      <th className="text-left font-normal py-2">Keyword</th>
                      <th className="text-right font-normal py-2 pr-4 w-24">Volume</th>
                      <th className="text-right font-normal py-2 pr-4 w-16">KD</th>
                      <th className="text-right font-normal py-2 pr-4 w-20">CPC</th>
                      <th className="text-right font-normal py-2 pr-4 w-24">Intent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.terms.map((t: any) => (
                      <tr key={t.id} className="border-t border-t-border/15 hover:bg-t-hover/50">
                        <td className="px-4 py-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            t.tier === 'main' ? 'bg-t-accent' : t.tier === 'category' ? 'bg-t-info' : 'bg-t-muted/40'
                          }`} title={t.tier} />
                        </td>
                        <td className={`py-1.5 ${t.tier === 'main' ? 'text-t-bright font-semibold' : 'text-t-text'}`}>
                          {t.keyword}
                        </td>
                        <td className="text-right py-1.5 pr-4 text-t-muted tabular-nums">
                          {t.search_volume?.toLocaleString() ?? '—'}
                        </td>
                        <td className="text-right py-1.5 pr-4 text-t-muted tabular-nums">
                          {t.keyword_difficulty ?? '—'}
                        </td>
                        <td className="text-right py-1.5 pr-4 text-t-muted tabular-nums">
                          {t.cpc != null ? `$${Number(t.cpc).toFixed(2)}` : '—'}
                        </td>
                        <td className="text-right py-1.5 pr-4 text-t-muted">
                          {t.search_intent ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Clusters() {
  const { profileId } = useParams();
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadClusters = async () => {
    if (!profileId) return;
    const res = await api.listClusters(profileId);
    setClusters(res.clusters);
    setLoading(false);
  };

  useEffect(() => { loadClusters(); }, [profileId]);

  // Poll for in-progress jobs
  useEffect(() => {
    const hasActive = clusters.some((c) => !['complete', 'error'].includes(c.status));
    if (hasActive) {
      pollRef.current = setInterval(loadClusters, 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [clusters]);

  const handleCreate = async () => {
    if (!profileId || !seed.trim()) return;
    setCreating(true);
    try {
      await api.createCluster(profileId, seed.trim());
      setSeed('');
      await loadClusters();
    } catch (err: any) {
      alert(err.message ?? 'Failed to create cluster');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profileId || !confirm('Delete this cluster?')) return;
    await api.deleteCluster(profileId, id);
    if (selectedId === id) setSelectedId(null);
    await loadClusters();
  };

  return (
    <PanelShell
      title="Keyword Clusters"
      subtitle="Semantic keyword grouping"
      actions={<Badge label="Alpha" variant="warning" />}
    >
      {/* New cluster form */}
      <div className="t-card rounded-lg p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Enter seed keyword..."
            className="flex-1 bg-t-deep border border-t-border rounded-md px-3 py-2 text-t-bright text-xs focus:outline-none focus:border-t-accent"
          />
          <button
            onClick={handleCreate}
            disabled={!seed.trim() || creating}
            className="flex items-center gap-1.5 bg-t-accent text-white rounded-md px-4 py-2 text-xs font-semibold hover:bg-t-accent disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {creating ? 'Creating...' : 'New Cluster'}
          </button>
        </div>
      </div>

      {/* Job list */}
      {loading ? (
        <p className="text-t-muted text-sm">Loading clusters...</p>
      ) : clusters.length === 0 ? (
        <div className="t-card rounded-lg p-12 text-center">
          <Network className="w-10 h-10 text-t-muted mx-auto mb-3" />
          <p className="text-t-text text-sm">No clusters yet.</p>
          <p className="text-t-muted text-xs mt-1">Enter a seed keyword above to start clustering.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clusters.map((cluster) => {
            const badge = STATUS_BADGES[cluster.status] ?? STATUS_BADGES.pending;
            const isSelected = selectedId === cluster.id;
            const isComplete = cluster.status === 'complete';

            return (
              <div key={cluster.id}>
                <div
                  className={`t-card rounded-lg p-4 cursor-pointer transition-colors ${isSelected ? 'border-t-accent/40' : ''}`}
                  onClick={() => isComplete && setSelectedId(isSelected ? null : cluster.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-t-bright text-sm font-semibold">{cluster.seed_keyword}</span>
                      <Badge label={badge.label} variant={badge.variant} />
                      {!['complete', 'error'].includes(cluster.status) && (
                        <Loader className="w-3 h-3 text-t-accent animate-spin" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete && (
                        <>
                          <span className="text-t-muted text-[10px]">
                            {cluster.group_count} groups, {cluster.term_count} terms
                          </span>
                          <a
                            href={api.getClusterExportUrl(profileId!, cluster.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-t-muted hover:text-t-bright rounded transition-colors"
                            title="Export XLSX"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(cluster.id); }}
                        className="p-1.5 text-t-muted hover:text-t-error rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {cluster.error_message && (
                    <p className="text-t-error text-[11px] mt-2">{cluster.error_message}</p>
                  )}
                  <p className="text-t-muted text-[10px] mt-1">
                    {new Date(cluster.created_at).toLocaleString()}
                  </p>
                </div>

                {isSelected && isComplete && profileId && (
                  <div className="mt-2 ml-4">
                    <ClusterDetail profileId={profileId} clusterId={cluster.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}

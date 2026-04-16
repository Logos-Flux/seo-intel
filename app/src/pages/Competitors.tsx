import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { Users, ExternalLink } from 'lucide-react';

export function Competitors() {
  const { profileId } = useParams();
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    api.getCompetitors(profileId).then((res) => {
      setCompetitors(res.competitors);
      setLoading(false);
    });
  }, [profileId]);

  return (
    <PanelShell
      title="Competitors"
      subtitle={`${competitors.length} tracked competitors`}
    >
      {loading ? (
        <p className="text-bridge-muted text-sm">Loading competitors...</p>
      ) : competitors.length === 0 ? (
        <div className="bridge-card rounded-lg p-12 text-center">
          <Users className="w-10 h-10 text-bridge-muted mx-auto mb-3" />
          <p className="text-bridge-text text-sm">No competitors tracked yet.</p>
          <p className="text-bridge-muted text-xs mt-1">Run an intake to discover competitors automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {competitors.map((comp) => (
            <div key={comp.id || comp.domain} className="bridge-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-bridge-bright text-sm font-semibold">{comp.domain}</h3>
                <ExternalLink className="w-3.5 h-3.5 text-bridge-muted" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-bridge-muted text-[9px] uppercase tracking-wider">Traffic</p>
                  <p className="text-bridge-bright text-sm font-bold">{comp.organic_traffic?.toLocaleString() ?? '—'}</p>
                </div>
                <div>
                  <p className="text-bridge-muted text-[9px] uppercase tracking-wider">Keywords</p>
                  <p className="text-bridge-bright text-sm font-bold">{comp.organic_keywords?.toLocaleString() ?? '—'}</p>
                </div>
                <div>
                  <p className="text-bridge-muted text-[9px] uppercase tracking-wider">Backlinks</p>
                  <p className="text-bridge-bright text-sm font-bold">{comp.backlinks?.toLocaleString() ?? '—'}</p>
                </div>
                <div>
                  <p className="text-bridge-muted text-[9px] uppercase tracking-wider">Ref. Domains</p>
                  <p className="text-bridge-bright text-sm font-bold">{comp.referring_domains?.toLocaleString() ?? '—'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-bridge-border/30">
                <p className="text-bridge-muted text-[10px]">
                  {comp.snapshotted_at ? new Date(comp.snapshotted_at).toLocaleDateString() : '—'}
                </p>
                <Link
                  to={`/app/${profileId}/gaps?competitor=${comp.domain}`}
                  className="text-bridge-info text-[10px] hover:underline"
                >
                  View Gaps &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

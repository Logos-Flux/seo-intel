import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { Badge } from '@/components/ui/Badge';

export function RankedKeywords() {
  const { profileId } = useParams();
  const [ranked, setRanked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    api.getRanked(profileId).then((res) => {
      setRanked(res.ranked);
      setLoading(false);
    });
  }, [profileId]);

  const difficultyBadge = (d: number | null) => {
    if (d == null) return null;
    if (d <= 30) return <Badge label="Easy" variant="success" />;
    if (d <= 60) return <Badge label="Med" variant="warning" />;
    return <Badge label="Hard" variant="error" />;
  };

  const truncateUrl = (url: string, maxLen = 50) =>
    url.length > maxLen ? url.slice(0, maxLen) + '...' : url;

  return (
    <PanelShell
      title="Ranked Keywords"
      subtitle={`${ranked.length} keywords currently ranked`}
    >
      {loading ? (
        <p className="text-bridge-muted text-sm">Loading ranked keywords...</p>
      ) : (
        <div className="bridge-card rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-bridge-border bg-bridge-surface/50">
                <th className="text-left text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Keyword</th>
                <th className="text-center text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Position</th>
                <th className="text-left text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">URL</th>
                <th className="text-right text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Volume</th>
                <th className="text-center text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Difficulty</th>
                <th className="text-center text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Intent</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.id || r.keyword} className="border-b border-bridge-border/30 hover:bg-bridge-hover/30">
                  <td className="px-4 py-3 text-bridge-bright">{r.keyword}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      label={`#${r.position}`}
                      variant={r.position <= 3 ? 'success' : r.position <= 10 ? 'info' : 'muted'}
                    />
                  </td>
                  <td className="px-4 py-3 text-bridge-muted font-mono text-[10px]">{truncateUrl(r.url)}</td>
                  <td className="px-4 py-3 text-right text-bridge-text">{r.search_volume?.toLocaleString() ?? '—'}</td>
                  <td className="px-4 py-3 text-center">{difficultyBadge(r.difficulty)}</td>
                  <td className="px-4 py-3 text-center">
                    {r.intent && <Badge label={r.intent} variant="info" />}
                  </td>
                </tr>
              ))}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-bridge-muted">No ranked keywords found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

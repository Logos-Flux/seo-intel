import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { Badge } from '@/components/ui/Badge';
import { GitCompare } from 'lucide-react';

export function GapAnalysis() {
  const { profileId } = useParams();
  const [searchParams] = useSearchParams();
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(searchParams.get('competitor'));
  const [gaps, setGaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gapsLoading, setGapsLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    api.getCompetitors(profileId).then((res) => {
      setCompetitors(res.competitors);
      setLoading(false);
      // Auto-select first competitor if none selected
      if (!selectedDomain && res.competitors.length > 0) {
        setSelectedDomain(res.competitors[0].domain);
      }
    });
  }, [profileId]);

  useEffect(() => {
    if (!profileId || !selectedDomain) return;
    setGapsLoading(true);
    api.getGaps(profileId, selectedDomain).then((res) => {
      setGaps(res.gaps);
      setGapsLoading(false);
    });
  }, [profileId, selectedDomain]);

  const positionBadge = (pos: number | null, isOurs: boolean) => {
    if (pos == null) {
      return isOurs ? <Badge label="Not ranked" variant="error" /> : <Badge label="—" variant="muted" />;
    }
    if (pos <= 3) return <Badge label={`#${pos}`} variant="success" />;
    if (pos <= 10) return <Badge label={`#${pos}`} variant="info" />;
    return <Badge label={`#${pos}`} variant="muted" />;
  };

  return (
    <PanelShell
      title="Gap Analysis"
      subtitle={selectedDomain ? `vs ${selectedDomain}` : 'Select a competitor'}
    >
      {/* Competitor selector */}
      {loading ? (
        <p className="text-bridge-muted text-sm">Loading competitors...</p>
      ) : competitors.length === 0 ? (
        <div className="bridge-card rounded-lg p-12 text-center">
          <GitCompare className="w-10 h-10 text-bridge-muted mx-auto mb-3" />
          <p className="text-bridge-text text-sm">No competitors to compare.</p>
          <p className="text-bridge-muted text-xs mt-1">Run an intake to discover competitors first.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {competitors.map((comp) => (
              <button
                key={comp.domain}
                onClick={() => setSelectedDomain(comp.domain)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  selectedDomain === comp.domain
                    ? 'bg-eva-purple/20 text-eva-purple border border-eva-purple/40'
                    : 'bg-bridge-surface text-bridge-text border border-bridge-border hover:border-bridge-border-active'
                }`}
              >
                {comp.domain}
              </button>
            ))}
          </div>

          {/* Gaps table */}
          {gapsLoading ? (
            <p className="text-bridge-muted text-sm">Loading gaps...</p>
          ) : (
            <div className="bridge-card rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-bridge-border bg-bridge-surface/50">
                    <th className="text-left text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Keyword</th>
                    <th className="text-right text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Volume</th>
                    <th className="text-center text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Their Position</th>
                    <th className="text-center text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Our Position</th>
                    <th className="text-center text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">Competition</th>
                    <th className="text-center text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium">SERP</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((gap) => (
                    <tr key={gap.id || gap.keyword} className="border-b border-bridge-border/30 hover:bg-bridge-hover/30">
                      <td className="px-4 py-3 text-bridge-bright">{gap.keyword}</td>
                      <td className="px-4 py-3 text-right text-bridge-text">{gap.search_volume?.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3 text-center">{positionBadge(gap.competitor_position, false)}</td>
                      <td className="px-4 py-3 text-center">{positionBadge(gap.our_position, true)}</td>
                      <td className="px-4 py-3 text-center">
                        {gap.competition_level && <Badge label={gap.competition_level} variant="muted" />}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/app/${profileId}/serp?q=${encodeURIComponent(gap.keyword)}`}
                          className="text-bridge-info hover:underline"
                        >
                          Check
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {gaps.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-bridge-muted">No gaps found for this competitor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PanelShell>
  );
}

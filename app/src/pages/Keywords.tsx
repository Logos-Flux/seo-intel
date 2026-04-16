import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { Badge } from '@/components/ui/Badge';
import { ChevronUp, ChevronDown } from 'lucide-react';

type SortKey = 'keyword' | 'search_volume' | 'difficulty' | 'intent' | 'competition_level' | 'cpc';
type SortDir = 'asc' | 'desc';

export function Keywords() {
  const { profileId } = useParams();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('search_volume');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    api.getKeywords(profileId).then((res) => {
      setKeywords(res.keywords);
      setLoading(false);
    });
  }, [profileId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'keyword' ? 'asc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    return [...keywords].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [keywords, sortKey, sortDir]);

  const difficultyBadge = (d: number | null) => {
    if (d == null) return <span className="text-bridge-muted">—</span>;
    if (d <= 30) return <Badge label={`${d} Easy`} variant="success" />;
    if (d <= 60) return <Badge label={`${d} Med`} variant="warning" />;
    return <Badge label={`${d} Hard`} variant="error" />;
  };

  const SortHeader = ({ label, field, align = 'left' }: { label: string; field: SortKey; align?: string }) => (
    <th
      onClick={() => toggleSort(field)}
      className={`text-${align} text-bridge-muted uppercase tracking-wider px-4 py-3 font-medium cursor-pointer hover:text-bridge-bright select-none`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </span>
    </th>
  );

  return (
    <PanelShell
      title="Keywords"
      subtitle={`${keywords.length} keywords tracked`}
    >
      {loading ? (
        <p className="text-bridge-muted text-sm">Loading keywords...</p>
      ) : (
        <div className="bridge-card rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-bridge-border bg-bridge-surface/50">
                <SortHeader label="Keyword" field="keyword" />
                <SortHeader label="Volume" field="search_volume" align="right" />
                <SortHeader label="Difficulty" field="difficulty" align="center" />
                <SortHeader label="Intent" field="intent" align="center" />
                <SortHeader label="Competition" field="competition_level" align="center" />
                <SortHeader label="CPC" field="cpc" align="right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((kw) => (
                <tr key={kw.id || kw.keyword} className="border-b border-bridge-border/30 hover:bg-bridge-hover/30">
                  <td className="px-4 py-3 text-bridge-bright">{kw.keyword}</td>
                  <td className="px-4 py-3 text-right text-bridge-text">{kw.search_volume?.toLocaleString() ?? '—'}</td>
                  <td className="px-4 py-3 text-center">{difficultyBadge(kw.difficulty)}</td>
                  <td className="px-4 py-3 text-center">
                    {kw.intent ? <Badge label={kw.intent} variant="info" /> : <span className="text-bridge-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {kw.competition_level ? <Badge label={kw.competition_level} variant="muted" /> : <span className="text-bridge-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-bridge-text">
                    {kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
              {keywords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-bridge-muted">No keywords found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

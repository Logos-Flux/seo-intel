import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useProfile } from '@/hooks/useProfile';
import { PanelShell } from '@/components/ui/PanelShell';
import { Badge } from '@/components/ui/Badge';
import { Search } from 'lucide-react';

export function SerpChecker() {
  const { profileId } = useParams();
  const [searchParams] = useSearchParams();
  const { activeProfile } = useProfile();
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<any[] | null>(null);
  const [ourPosition, setOurPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!profileId || !keyword.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.getSerp(profileId, keyword.trim());
      setResults(res.results);
      setOurPosition(res.our_position);
    } catch {
      setResults([]);
      setOurPosition(null);
    }
    setLoading(false);
  };

  const profileDomain = activeProfile?.domain ?? '';

  const truncateUrl = (url: string, maxLen = 60) =>
    url.length > maxLen ? url.slice(0, maxLen) + '...' : url;

  return (
    <PanelShell
      title="SERP Checker"
      subtitle="Check search engine results for any keyword"
    >
      {/* Search input */}
      <div className="flex gap-2 max-w-xl">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter a keyword..."
          className="flex-1 bg-t-surface border border-t-border rounded-md px-3 py-2 text-t-bright text-xs focus:outline-none focus:border-t-accent"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-1.5 bg-t-accent/15 border border-t-accent/30 rounded-md px-4 py-2 text-t-accent text-xs hover:bg-t-accent/25 transition-colors disabled:opacity-50"
        >
          <Search className="w-3.5 h-3.5" /> Search
        </button>
      </div>

      {/* Our position banner */}
      {searched && !loading && (
        <div className="t-card rounded-lg p-4 max-w-xl">
          <p className="text-t-muted text-[10px] uppercase tracking-wider mb-1">Our Position</p>
          {ourPosition != null ? (
            <div className="flex items-center gap-2">
              <Badge label={`#${ourPosition}`} variant={ourPosition <= 3 ? 'success' : ourPosition <= 10 ? 'info' : 'warning'} />
              <span className="text-t-bright text-sm font-semibold">{profileDomain}</span>
            </div>
          ) : (
            <p className="text-t-error text-sm font-semibold">Not ranked</p>
          )}
        </div>
      )}

      {/* Results table */}
      {loading ? (
        <p className="text-t-muted text-sm">Searching...</p>
      ) : results && (
        <div className="t-card rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-t-border bg-t-surface/50">
                <th className="text-center text-t-muted uppercase tracking-wider px-4 py-3 font-medium w-16">#</th>
                <th className="text-left text-t-muted uppercase tracking-wider px-4 py-3 font-medium">Domain</th>
                <th className="text-left text-t-muted uppercase tracking-wider px-4 py-3 font-medium">Title</th>
                <th className="text-left text-t-muted uppercase tracking-wider px-4 py-3 font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const isOurs = r.domain === profileDomain || r.domain?.includes(profileDomain);
                return (
                  <tr
                    key={r.position}
                    className={`border-b border-t-border/30 ${isOurs ? 'bg-t-accent-alt/5' : 'hover:bg-t-hover/30'}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <Badge label={`${r.position}`} variant={r.position <= 3 ? 'success' : r.position <= 10 ? 'info' : 'muted'} />
                    </td>
                    <td className={`px-4 py-3 ${isOurs ? 'text-t-accent-alt font-bold' : 'text-t-bright'}`}>
                      {r.domain}
                    </td>
                    <td className="px-4 py-3 text-t-text">{r.title}</td>
                    <td className="px-4 py-3 text-t-muted font-mono text-[10px]">{truncateUrl(r.url)}</td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-t-muted">No results found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

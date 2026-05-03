import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { Users, ExternalLink, X, Plus, Sparkles, RefreshCw, Loader, Check, Trash2 } from 'lucide-react';

interface Discovered {
  domain: string;
  reason: string;
  verified: boolean;
}

export function Competitors() {
  const { profileId } = useParams();
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Discovery flow state
  const [discovered, setDiscovered] = useState<Discovered[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [showCurate, setShowCurate] = useState(false);
  const [curated, setCurated] = useState<string[]>([]);
  const [addInput, setAddInput] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<Record<string, string> | null>(null);

  // Inline add state
  const [showAddInline, setShowAddInline] = useState(false);
  const [inlineAddInput, setInlineAddInput] = useState('');
  const [addingInline, setAddingInline] = useState(false);

  const loadCompetitors = () => {
    if (!profileId) return;
    setLoading(true);
    api.getCompetitors(profileId).then((res) => {
      setCompetitors(res.competitors);
      setLoading(false);
    });
  };

  useEffect(() => { loadCompetitors(); }, [profileId]);

  const handleDiscover = async () => {
    if (!profileId) return;
    setDiscovering(true);
    setEnrichResult(null);
    try {
      const res = await api.discoverCompetitors(profileId);
      setDiscovered(res.competitors);
      setCurated(res.competitors.filter((c: Discovered) => c.verified).map((c: Discovered) => c.domain));
      setShowCurate(true);
    } catch (err: any) {
      alert(err.message ?? 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const removeCurated = (domain: string) => {
    setCurated((prev) => prev.filter((d) => d !== domain));
  };

  const addCurated = () => {
    const domain = addInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain || curated.includes(domain)) return;
    setCurated((prev) => [...prev, domain]);
    setAddInput('');
  };

  const handleConfirmAndEnrich = async () => {
    if (!profileId || curated.length === 0) return;
    setEnriching(true);
    try {
      await api.saveCompetitors(profileId, curated);
      const res = await api.enrichCompetitors(profileId);
      setEnrichResult(res.enriched);
      setShowCurate(false);
      loadCompetitors();
    } catch (err: any) {
      alert(err.message ?? 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  // Remove a competitor from the saved list and refresh
  const handleRemoveCompetitor = async (domain: string) => {
    if (!profileId) return;
    const remaining = competitors
      .map((c) => c.domain)
      .filter((d: string) => d !== domain);
    await api.saveCompetitors(profileId, remaining);
    loadCompetitors();
  };

  // Add a competitor inline, save, and enrich just that one
  const handleAddInline = async () => {
    if (!profileId) return;
    const domain = inlineAddInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return;
    if (competitors.some((c) => c.domain === domain)) {
      alert('Already tracking this competitor');
      return;
    }
    setAddingInline(true);
    try {
      const existing = competitors.map((c) => c.domain);
      await api.saveCompetitors(profileId, [...existing, domain]);
      await api.enrichCompetitors(profileId);
      setInlineAddInput('');
      setShowAddInline(false);
      loadCompetitors();
    } catch (err: any) {
      alert(err.message ?? 'Failed to add');
    } finally {
      setAddingInline(false);
    }
  };

  const hasData = competitors.length > 0;

  return (
    <PanelShell
      title="Competitors"
      subtitle={hasData ? `${competitors.length} tracked competitors` : 'Discover and track competitors'}
      actions={
        <div className="flex gap-2">
          {hasData && (
            <button
              onClick={() => setShowAddInline(!showAddInline)}
              className="flex items-center gap-1.5 bg-t-deep border border-t-border text-t-text rounded-md px-3 py-1.5 text-xs hover:text-t-bright hover:border-t-accent transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          )}
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="flex items-center gap-1.5 bg-t-accent text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-t-accent disabled:opacity-50 transition-colors"
          >
            {discovering ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {discovering ? 'Finding...' : 'Find Competitors'}
          </button>
        </div>
      }
    >
      {/* Inline add bar */}
      {showAddInline && (
        <div className="t-card rounded-lg p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inlineAddInput}
              onChange={(e) => setInlineAddInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddInline()}
              placeholder="competitor-domain.com"
              className="flex-1 bg-t-deep border border-t-border rounded-md px-3 py-2 text-t-bright text-xs focus:outline-none focus:border-t-accent"
              autoFocus
            />
            <button
              onClick={handleAddInline}
              disabled={!inlineAddInput.trim() || addingInline}
              className="flex items-center gap-1.5 bg-t-accent text-white rounded-md px-4 py-2 text-xs font-semibold hover:bg-t-accent disabled:opacity-50 transition-colors"
            >
              {addingInline ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {addingInline ? 'Adding...' : 'Add & Enrich'}
            </button>
          </div>
        </div>
      )}

      {/* Curation panel */}
      {showCurate && (
        <div className="t-card rounded-lg p-5 border-2 border-t-accent/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-t-bright text-sm font-semibold">Review Competitors</h3>
              <p className="text-t-muted text-[11px] mt-0.5">Remove irrelevant ones, add missing ones, then confirm to pull SEO data.</p>
            </div>
            <span className="text-t-accent text-xs font-medium">{curated.length} selected</span>
          </div>

          {/* Curated list (verified) */}
          <div className="space-y-1.5 mb-4">
            {curated.map((domain) => {
              const info = discovered.find((d) => d.domain === domain);
              return (
                <div key={domain} className="flex items-center justify-between bg-t-deep rounded-md px-3 py-2 group">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <Check className="w-3 h-3 text-t-success shrink-0" />
                    <span className="text-t-bright text-xs font-medium">{domain}</span>
                    {info?.reason && (
                      <span className="text-t-muted text-[10px] truncate">{info.reason}</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeCurated(domain)}
                    className="ml-2 p-1 text-t-muted hover:text-t-error rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Unverified domains (excluded by default, click to add) */}
          {discovered.filter((d) => !d.verified && !curated.includes(d.domain)).length > 0 && (
            <div className="mb-4">
              <p className="text-t-muted text-[10px] uppercase tracking-wider mb-1.5">Unverified domains (click to add)</p>
              <div className="space-y-1">
                {discovered.filter((d) => !d.verified && !curated.includes(d.domain)).map((d) => (
                  <button
                    key={d.domain}
                    onClick={() => setCurated((prev) => [...prev, d.domain])}
                    className="flex items-center gap-2 w-full text-left bg-t-deep/50 rounded-md px-3 py-2 hover:bg-t-deep transition-colors"
                  >
                    <span className="text-t-error text-[10px]">?</span>
                    <span className="text-t-muted text-xs">{d.domain}</span>
                    <span className="text-t-muted text-[10px] truncate">{d.reason}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add manual */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCurated()}
              placeholder="Add competitor domain..."
              className="flex-1 bg-t-deep border border-t-border rounded-md px-3 py-2 text-t-bright text-xs focus:outline-none focus:border-t-accent"
            />
            <button
              onClick={addCurated}
              disabled={!addInput.trim()}
              className="flex items-center gap-1 px-3 py-2 bg-t-deep border border-t-border rounded-md text-t-text text-xs hover:text-t-bright hover:border-t-accent disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {/* Confirm */}
          <div className="flex items-center justify-between pt-3 border-t border-t-border">
            <button
              onClick={() => setShowCurate(false)}
              className="text-t-muted text-xs hover:text-t-bright transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAndEnrich}
              disabled={curated.length === 0 || enriching}
              className="flex items-center gap-1.5 bg-t-accent text-white rounded-md px-4 py-2 text-xs font-semibold hover:bg-t-accent disabled:opacity-50 transition-colors"
            >
              {enriching ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {enriching ? 'Enriching...' : `Confirm & Enrich (${curated.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Enrich result toast */}
      {enrichResult && (
        <div className="t-card rounded-lg p-4">
          <p className="text-t-bright text-xs font-semibold mb-2">Enrichment Complete</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(enrichResult).map(([domain, status]) => (
              <span
                key={domain}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
                  status === 'ok' ? 'bg-t-success/10 text-t-success' : 'bg-t-error/10 text-t-error'
                }`}
              >
                {status === 'ok' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {domain}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Competitor cards */}
      {loading ? (
        <p className="text-t-muted text-sm">Loading competitors...</p>
      ) : !hasData && !showCurate ? (
        <div className="t-card rounded-lg p-12 text-center">
          <Users className="w-10 h-10 text-t-muted mx-auto mb-3" />
          <p className="text-t-text text-sm">No competitors tracked yet.</p>
          <p className="text-t-muted text-xs mt-1">Click "Find Competitors" to discover them with AI.</p>
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {competitors.map((comp) => (
            <div key={comp.id || comp.domain} className="t-card rounded-lg p-4 relative group">
              <button
                onClick={() => handleRemoveCompetitor(comp.domain)}
                className="absolute top-3 right-3 p-1.5 rounded-md text-t-muted opacity-0 group-hover:opacity-100 hover:text-t-error hover:bg-t-error/10 transition-all"
                title="Remove competitor"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-between mb-3 pr-6">
                <h3 className="text-t-bright text-sm font-semibold">{comp.domain}</h3>
                <a href={`https://${comp.domain}`} target="_blank" rel="noopener" className="text-t-muted hover:text-t-bright">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-t-muted text-[9px] uppercase tracking-wider">Traffic</p>
                  <p className="text-t-bright text-sm font-bold">{comp.organic_traffic?.toLocaleString() ?? '—'}</p>
                </div>
                <div>
                  <p className="text-t-muted text-[9px] uppercase tracking-wider">Keywords</p>
                  <p className="text-t-bright text-sm font-bold">{comp.organic_keywords?.toLocaleString() ?? '—'}</p>
                </div>
                <div>
                  <p className="text-t-muted text-[9px] uppercase tracking-wider">Backlinks</p>
                  <p className="text-t-bright text-sm font-bold">{comp.backlinks?.toLocaleString() ?? '—'}</p>
                </div>
                <div>
                  <p className="text-t-muted text-[9px] uppercase tracking-wider">Ref. Domains</p>
                  <p className="text-t-bright text-sm font-bold">{comp.referring_domains?.toLocaleString() ?? '—'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-t-border/30">
                <p className="text-t-muted text-[10px]">
                  {comp.snapshotted_at ? new Date(comp.snapshotted_at).toLocaleDateString() : '—'}
                </p>
                <Link
                  to={`/${profileId}/gaps?competitor=${comp.domain}`}
                  className="text-t-info text-[10px] hover:underline"
                >
                  View Gaps &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </PanelShell>
  );
}

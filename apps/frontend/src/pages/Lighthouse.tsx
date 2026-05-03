import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { RefreshCw, Loader } from 'lucide-react';

function ScoreGauge({ label, score }: { label: string; score: number | null }) {
  if (score == null) return (
    <div className="text-center">
      <div className="text-t-muted text-2xl font-bold">—</div>
      <div className="text-t-muted text-[10px] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );

  const color = score >= 90 ? 'text-t-success' : score >= 50 ? 'text-t-warning' : 'text-t-error';

  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="6" className="text-t-surface" />
          <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="6"
            className={color}
            strokeDasharray={`${(score / 100) * 220} 220`}
            strokeLinecap="round"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${color}`}>
          {score}
        </div>
      </div>
      <div className="text-t-muted text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function MetricRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  const formatted = unit === 'ms' ? `${(value / 1000).toFixed(1)}s` :
                    unit === 'cls' ? value.toFixed(3) :
                    `${value.toFixed(0)}${unit}`;
  return (
    <div className="flex justify-between items-center py-2 border-b border-t-border/30">
      <span className="text-t-text text-xs">{label}</span>
      <span className="text-t-bright text-xs font-medium">{formatted}</span>
    </div>
  );
}

export function Lighthouse() {
  const { profileId } = useParams();
  const [data, setData] = useState<any>(null);
  const [auditedAt, setAuditedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    api.getLighthouse(profileId)
      .then((res) => {
        setData(res.lighthouse);
        setAuditedAt(res.audited_at);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [profileId]);

  const handleRerun = async () => {
    if (!profileId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await api.runLighthouse(profileId);
      setData(res.lighthouse);
      setAuditedAt(res.audited_at);
    } catch (err: any) {
      setError(err.message ?? 'Audit failed');
    } finally {
      setRunning(false);
    }
  };

  const hasData = data != null;

  return (
    <PanelShell
      title="Lighthouse Audit"
      subtitle={data?.url ?? 'Technical SEO & performance analysis'}
      actions={
        <button
          onClick={handleRerun}
          disabled={running}
          className="flex items-center gap-1.5 bg-t-accent text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-t-accent disabled:opacity-50 transition-colors"
        >
          {running ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {running ? 'Running...' : hasData ? 'Rerun Audit' : 'Run Audit'}
        </button>
      }
    >
      {loading ? (
        <div className="t-card rounded-lg p-12 text-center">
          <div className="text-t-muted text-sm">Loading audit data...</div>
        </div>
      ) : error ? (
        <div className="t-card rounded-lg p-6">
          <p className="text-t-error text-xs">{error}</p>
        </div>
      ) : hasData ? (
        <>
          {auditedAt && (
            <p className="text-t-muted text-[11px]">
              Last run: {new Date(auditedAt).toLocaleString()}
            </p>
          )}

          {/* Score gauges */}
          <div className="t-card rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <ScoreGauge label="Performance" score={data.performance} />
              <ScoreGauge label="Accessibility" score={data.accessibility} />
              <ScoreGauge label="Best Practices" score={data.best_practices} />
              <ScoreGauge label="SEO" score={data.seo} />
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="t-card rounded-lg p-4">
            <h3 className="text-t-bright text-sm font-semibold mb-3">Core Web Vitals</h3>
            <MetricRow label="First Contentful Paint (FCP)" value={data.fcp} unit="ms" />
            <MetricRow label="Largest Contentful Paint (LCP)" value={data.lcp} unit="ms" />
            <MetricRow label="Cumulative Layout Shift (CLS)" value={data.cls} unit="cls" />
            <MetricRow label="Total Blocking Time (TBT)" value={data.tbt} unit="ms" />
            <MetricRow label="Speed Index" value={data.speed_index} unit="ms" />
          </div>
        </>
      ) : (
        <div className="t-card rounded-lg p-12 text-center">
          <RefreshCw className="w-10 h-10 text-t-muted mx-auto mb-3" />
          <p className="text-t-text text-sm">No audit data yet.</p>
          <p className="text-t-muted text-xs mt-1">Click "Run Audit" to perform a Lighthouse analysis.</p>
        </div>
      )}
    </PanelShell>
  );
}

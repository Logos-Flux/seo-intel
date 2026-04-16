import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';

function ScoreGauge({ label, score }: { label: string; score: number | null }) {
  if (score == null) return (
    <div className="text-center">
      <div className="text-bridge-muted text-2xl font-bold">—</div>
      <div className="text-bridge-muted text-[10px] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );

  const color = score >= 90 ? 'text-bridge-success' : score >= 50 ? 'text-bridge-warning' : 'text-bridge-error';
  const bg = score >= 90 ? 'bg-bridge-success' : score >= 50 ? 'bg-bridge-warning' : 'bg-bridge-error';

  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="6" className="text-bridge-surface" />
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
      <div className="text-bridge-muted text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function MetricRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  const formatted = unit === 'ms' ? `${(value / 1000).toFixed(1)}s` :
                    unit === 'cls' ? value.toFixed(3) :
                    `${value.toFixed(0)}${unit}`;
  return (
    <div className="flex justify-between items-center py-2 border-b border-bridge-border/30">
      <span className="text-bridge-text text-xs">{label}</span>
      <span className="text-bridge-bright text-xs font-medium">{formatted}</span>
    </div>
  );
}

export function Lighthouse() {
  const { profileId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    api.getLighthouse(profileId)
      .then((res) => {
        setData(res.lighthouse);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [profileId]);

  return (
    <PanelShell
      title="Lighthouse Audit"
      subtitle={data?.url ?? 'Technical SEO & performance analysis'}
    >
      {loading ? (
        <div className="bridge-card rounded-lg p-12 text-center">
          <div className="text-bridge-muted text-sm animate-pulse">Running Lighthouse audit... this may take 10-15 seconds.</div>
        </div>
      ) : error ? (
        <div className="bridge-card rounded-lg p-6">
          <p className="text-bridge-error text-xs">{error}</p>
        </div>
      ) : data ? (
        <>
          {/* Score gauges */}
          <div className="bridge-card rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <ScoreGauge label="Performance" score={data.performance} />
              <ScoreGauge label="Accessibility" score={data.accessibility} />
              <ScoreGauge label="Best Practices" score={data.best_practices} />
              <ScoreGauge label="SEO" score={data.seo} />
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="bridge-card rounded-lg p-4">
            <h3 className="text-bridge-bright text-sm font-semibold mb-3">Core Web Vitals</h3>
            <MetricRow label="First Contentful Paint (FCP)" value={data.fcp} unit="ms" />
            <MetricRow label="Largest Contentful Paint (LCP)" value={data.lcp} unit="ms" />
            <MetricRow label="Cumulative Layout Shift (CLS)" value={data.cls} unit="cls" />
            <MetricRow label="Total Blocking Time (TBT)" value={data.tbt} unit="ms" />
            <MetricRow label="Speed Index" value={data.speed_index} unit="ms" />
          </div>
        </>
      ) : (
        <div className="bridge-card rounded-lg p-6">
          <p className="text-bridge-muted text-sm">No audit data available.</p>
        </div>
      )}
    </PanelShell>
  );
}

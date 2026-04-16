import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { Badge } from '@/components/ui/Badge';

export function TechStack() {
  const { profileId } = useParams();
  const [data, setData] = useState<{ domain: string; technologies: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    api.getTech(profileId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [profileId]);

  // Group technologies by category
  const grouped: Record<string, any[]> = {};
  if (data?.technologies) {
    for (const tech of data.technologies) {
      const cat = tech.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(tech);
    }
  }
  const categories = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  return (
    <PanelShell
      title="Tech Stack"
      subtitle={data ? `${data.domain} — ${data.technologies.length} technologies detected` : 'Domain technology analysis'}
    >
      {loading ? (
        <div className="bridge-card rounded-lg p-12 text-center">
          <div className="text-bridge-muted text-sm animate-pulse">Scanning domain technologies...</div>
        </div>
      ) : error ? (
        <div className="bridge-card rounded-lg p-6">
          <p className="text-bridge-error text-xs">{error}</p>
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(([category, techs]) => (
            <div key={category} className="bridge-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-bridge-bright text-xs font-semibold">{category}</h3>
                <Badge label={`${techs.length}`} variant="muted" />
              </div>
              <div className="space-y-2">
                {techs.map((tech: any) => (
                  <div key={tech.name} className="flex items-center justify-between py-1.5 border-b border-bridge-border/20 last:border-0">
                    <span className="text-bridge-text text-xs">{tech.name}</span>
                    {tech.version && (
                      <span className="text-bridge-muted text-[10px] font-mono">{tech.version}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bridge-card rounded-lg p-6">
          <p className="text-bridge-muted text-sm">No technologies detected.</p>
        </div>
      )}
    </PanelShell>
  );
}

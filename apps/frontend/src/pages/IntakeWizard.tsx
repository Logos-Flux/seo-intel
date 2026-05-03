import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useProfile } from '@/hooks/useProfile';
import { PanelShell } from '@/components/ui/PanelShell';
import { Zap, CheckCircle, Loader } from 'lucide-react';

type WizardStep = 'form' | 'running' | 'complete';

export function IntakeWizard() {
  const navigate = useNavigate();
  const { refreshProfiles, setActiveProfileId } = useProfile();
  const [step, setStep] = useState<WizardStep>('form');
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!domain || !name) return;
    setStep('running');
    setError(null);
    try {
      const res = await api.runIntake({ domain, name });
      setResult(res);
      setStep('complete');
      // Refresh sidebar profiles and set the new one as active
      setActiveProfileId(res.profile_id);
      await refreshProfiles();
    } catch (err) {
      setError(String(err));
      setStep('form');
    }
  };

  return (
    <PanelShell title="Intake Wizard" subtitle="Onboard a new client company">
      {step === 'form' && (
        <div className="t-card rounded-lg p-6 max-w-lg">
          {error && <p className="text-t-error text-xs mb-4">{error}</p>}
          <div className="space-y-4">
            <div>
              <label className="text-t-muted text-[10px] uppercase tracking-wider block mb-1">Company Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Solar Co."
                className="w-full bg-t-surface border border-t-border rounded-md px-3 py-2 text-t-bright text-xs focus:outline-none focus:border-t-accent" />
            </div>
            <div>
              <label className="text-t-muted text-[10px] uppercase tracking-wider block mb-1">Domain</label>
              <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acmesolar.com"
                className="w-full bg-t-surface border border-t-border rounded-md px-3 py-2 text-t-bright text-xs focus:outline-none focus:border-t-accent" />
            </div>
            <button onClick={handleSubmit}
              className="flex items-center gap-2 bg-t-accent-alt/15 border border-t-accent-alt/30 rounded-md px-4 py-2 text-t-accent-alt text-xs hover:bg-t-accent-alt/25 transition-colors">
              <Zap className="w-4 h-4" /> Start Discovery
            </button>
          </div>
        </div>
      )}

      {step === 'running' && (
        <div className="t-card rounded-lg p-12 text-center max-w-lg">
          <Loader className="w-8 h-8 text-t-accent mx-auto mb-4 animate-spin" />
          <p className="text-t-bright text-sm">Running auto-discovery...</p>
          <p className="text-t-muted text-xs mt-2">Discovering keywords, competitors, and running audits. This takes 1-2 minutes.</p>
        </div>
      )}

      {step === 'complete' && result && (
        <div className="t-card rounded-lg p-6 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-t-success" />
            <h3 className="text-t-bright text-sm font-semibold">Discovery Complete</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-t-surface rounded-md p-3">
              <p className="text-t-muted text-[10px] uppercase">Keywords</p>
              <p className="text-t-bright text-lg font-bold">{result.summary.keywords_discovered.toLocaleString()}</p>
            </div>
            <div className="bg-t-surface rounded-md p-3">
              <p className="text-t-muted text-[10px] uppercase">Ranked Keywords</p>
              <p className="text-t-bright text-lg font-bold">{result.summary.ranked_keywords.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-t-muted text-[11px] mb-4">Head to Competitors to discover and enrich competitor data.</p>
          <button onClick={() => navigate(`/${result.profile_id}`)}
            className="bg-t-info/15 border border-t-info/30 rounded-md px-4 py-2 text-t-info text-xs hover:bg-t-info/25 transition-colors">
            Go to Dashboard &rarr;
          </button>
        </div>
      )}
    </PanelShell>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { Zap, CheckCircle, Loader } from 'lucide-react';

type WizardStep = 'form' | 'running' | 'complete';

export function IntakeWizard() {
  const navigate = useNavigate();
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
    } catch (err) {
      setError(String(err));
      setStep('form');
    }
  };

  return (
    <PanelShell title="Intake Wizard" subtitle="Onboard a new client company">
      {step === 'form' && (
        <div className="bridge-card rounded-lg p-6 max-w-lg">
          {error && <p className="text-bridge-error text-xs mb-4">{error}</p>}
          <div className="space-y-4">
            <div>
              <label className="text-bridge-muted text-[10px] uppercase tracking-wider block mb-1">Company Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Solar Co."
                className="w-full bg-bridge-surface border border-bridge-border rounded-md px-3 py-2 text-bridge-bright text-xs focus:outline-none focus:border-eva-purple" />
            </div>
            <div>
              <label className="text-bridge-muted text-[10px] uppercase tracking-wider block mb-1">Domain</label>
              <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acmesolar.com"
                className="w-full bg-bridge-surface border border-bridge-border rounded-md px-3 py-2 text-bridge-bright text-xs focus:outline-none focus:border-eva-purple" />
            </div>
            <button onClick={handleSubmit}
              className="flex items-center gap-2 bg-eva-green/15 border border-eva-green/30 rounded-md px-4 py-2 text-eva-green text-xs hover:bg-eva-green/25 transition-colors">
              <Zap className="w-4 h-4" /> Start Discovery
            </button>
          </div>
        </div>
      )}

      {step === 'running' && (
        <div className="bridge-card rounded-lg p-12 text-center max-w-lg">
          <Loader className="w-8 h-8 text-eva-purple mx-auto mb-4 animate-spin" />
          <p className="text-bridge-bright text-sm">Running auto-discovery...</p>
          <p className="text-bridge-muted text-xs mt-2">Discovering keywords, competitors, and gaps. This takes 15-30 seconds.</p>
        </div>
      )}

      {step === 'complete' && result && (
        <div className="bridge-card rounded-lg p-6 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-bridge-success" />
            <h3 className="text-bridge-bright text-sm font-semibold">Discovery Complete</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-bridge-surface rounded-md p-3">
              <p className="text-bridge-muted text-[10px] uppercase">Keywords</p>
              <p className="text-bridge-bright text-lg font-bold">{result.summary.keywords_discovered.toLocaleString()}</p>
            </div>
            <div className="bg-bridge-surface rounded-md p-3">
              <p className="text-bridge-muted text-[10px] uppercase">Competitors</p>
              <p className="text-bridge-bright text-lg font-bold">{result.summary.competitors_found}</p>
            </div>
            <div className="bg-bridge-surface rounded-md p-3">
              <p className="text-bridge-muted text-[10px] uppercase">Ranked Keywords</p>
              <p className="text-bridge-bright text-lg font-bold">{result.summary.ranked_keywords.toLocaleString()}</p>
            </div>
            <div className="bg-bridge-surface rounded-md p-3">
              <p className="text-bridge-muted text-[10px] uppercase">Gaps Found</p>
              <p className="text-bridge-bright text-lg font-bold">{result.summary.gaps_found.toLocaleString()}</p>
            </div>
          </div>
          <button onClick={() => navigate(`/app/${result.profile_id}`)}
            className="bg-bridge-info/15 border border-bridge-info/30 rounded-md px-4 py-2 text-bridge-info text-xs hover:bg-bridge-info/25 transition-colors">
            Go to Dashboard &rarr;
          </button>
        </div>
      )}
    </PanelShell>
  );
}

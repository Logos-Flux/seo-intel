import { PanelShell } from '@/components/ui/PanelShell';
import { useState, useEffect, useCallback } from 'react';
import { Check, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';

const CF_ACCOUNT_ID = 'da428703889b8aae0baf5fd8acafcdd5';
const CF_SCRIPT_NAME = '52l-seo-api';

interface SecretField {
  key: string;
  label: string;
  placeholder: string;
  description: string;
}

const SECRETS: SecretField[] = [
  {
    key: 'SEO_INTEL_API_KEY',
    label: 'API Key',
    placeholder: 'your-api-key',
    description: 'Authentication key for the SEO API. Used by the frontend proxy to call the worker.',
  },
  {
    key: 'DATAFORSEO_LOGIN',
    label: 'DataForSEO Login',
    placeholder: 'your-dataforseo-login',
    description: 'Your DataForSEO account login email.',
  },
  {
    key: 'DATAFORSEO_PASSWORD',
    label: 'DataForSEO Password',
    placeholder: 'your-dataforseo-password',
    description: 'Your DataForSEO account password.',
  },
  {
    key: 'CF_API_GATEWAY',
    label: 'CF AI Gateway Token',
    placeholder: 'cfut_...',
    description: 'Cloudflare AI Gateway token for LLM-powered competitor discovery.',
  },
];

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

async function cfProxy(body: Record<string, string>) {
  const res = await fetch('/cf-secrets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function Settings() {
  const [cfToken, setCfToken] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [existingSecrets, setExistingSecrets] = useState<string[]>([]);
  const [loadingSecrets, setLoadingSecrets] = useState(false);

  const fetchExistingSecrets = useCallback(async () => {
    if (!cfToken) return;
    setLoadingSecrets(true);
    try {
      const data = await cfProxy({
        action: 'list',
        cf_token: cfToken,
        account_id: CF_ACCOUNT_ID,
        script_name: CF_SCRIPT_NAME,
      });
      if (data.success) {
        setExistingSecrets((data.result ?? []).map((s: any) => s.name));
      }
    } catch {
      // silently fail — user may not have deployed yet
    } finally {
      setLoadingSecrets(false);
    }
  }, [cfToken]);

  useEffect(() => {
    if (cfToken.length > 20) {
      fetchExistingSecrets();
    }
  }, [cfToken, fetchExistingSecrets]);

  const saveSecret = async (key: string) => {
    const value = values[key];
    if (!value?.trim()) return;
    if (!cfToken) {
      setErrors((prev) => ({ ...prev, [key]: 'Enter your Cloudflare API token first' }));
      return;
    }

    setStatuses((prev) => ({ ...prev, [key]: 'saving' }));
    setErrors((prev) => ({ ...prev, [key]: '' }));

    try {
      const data = await cfProxy({
        action: 'put',
        cf_token: cfToken,
        account_id: CF_ACCOUNT_ID,
        script_name: CF_SCRIPT_NAME,
        secret_name: key,
        secret_value: value.trim(),
      });
      if (data.success) {
        setStatuses((prev) => ({ ...prev, [key]: 'success' }));
        setExistingSecrets((prev) => prev.includes(key) ? prev : [...prev, key]);
        setTimeout(() => setStatuses((prev) => ({ ...prev, [key]: 'idle' })), 3000);
      } else {
        const msg = data.errors?.[0]?.message ?? 'Failed to save secret';
        setErrors((prev) => ({ ...prev, [key]: msg }));
        setStatuses((prev) => ({ ...prev, [key]: 'error' }));
      }
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [key]: err.message ?? 'Network error' }));
      setStatuses((prev) => ({ ...prev, [key]: 'error' }));
    }
  };

  const allConfigured = SECRETS.every((s) => existingSecrets.includes(s.key));

  return (
    <PanelShell
      title="Settings"
      subtitle="Configure API credentials stored as Cloudflare Worker secrets"
    >
      {/* CF Token */}
      <div className="t-card rounded-lg p-5">
        <h3 className="text-t-bright text-sm font-semibold mb-1">Cloudflare API Token</h3>
        <p className="text-t-muted text-[11px] mb-3">
          Required to manage worker secrets. Needs <code className="text-t-accent bg-t-accent/10 px-1 rounded">Workers Scripts: Edit</code> permission on this account.
          This token is only used in your browser and is never stored.
        </p>
        <div className="relative">
          <input
            type={revealed['cf'] ? 'text' : 'password'}
            value={cfToken}
            onChange={(e) => setCfToken(e.target.value)}
            placeholder="cfat_..."
            className="w-full bg-t-deep border border-t-border rounded-md px-3 py-2 text-t-bright text-xs font-mono focus:outline-none focus:border-t-accent pr-8"
          />
          <button
            onClick={() => setRevealed((prev) => ({ ...prev, cf: !prev.cf }))}
            className="absolute right-2 top-2 text-t-muted hover:text-t-bright"
          >
            {revealed['cf'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Status overview */}
      <div className="t-card rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-t-bright text-sm font-semibold">Secret Status</h3>
          <button
            onClick={fetchExistingSecrets}
            disabled={!cfToken || loadingSecrets}
            className="flex items-center gap-1 text-t-muted text-[10px] hover:text-t-bright disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${loadingSecrets ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SECRETS.map((s) => (
            <div
              key={s.key}
              className={`rounded-md px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                existingSecrets.includes(s.key)
                  ? 'bg-t-success/10 text-t-success'
                  : 'bg-t-muted/10 text-t-muted'
              }`}
            >
              {existingSecrets.includes(s.key) ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {s.label}
            </div>
          ))}
        </div>
        {allConfigured && (
          <p className="text-t-success text-[11px] mt-3">All secrets configured. Worker is ready.</p>
        )}
      </div>

      {/* Individual secret forms */}
      {SECRETS.map((secret) => (
        <div key={secret.key} className="t-card rounded-lg p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-t-bright text-sm font-semibold">{secret.label}</h3>
            <code className="text-t-muted text-[10px]">{secret.key}</code>
          </div>
          <p className="text-t-muted text-[11px] mb-3">{secret.description}</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={revealed[secret.key] ? 'text' : 'password'}
                value={values[secret.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [secret.key]: e.target.value }))}
                placeholder={secret.placeholder}
                className="w-full bg-t-deep border border-t-border rounded-md px-3 py-2 text-t-bright text-xs font-mono focus:outline-none focus:border-t-accent pr-8"
              />
              <button
                onClick={() => setRevealed((prev) => ({ ...prev, [secret.key]: !prev[secret.key] }))}
                className="absolute right-2 top-2 text-t-muted hover:text-t-bright"
              >
                {revealed[secret.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => saveSecret(secret.key)}
              disabled={!values[secret.key]?.trim() || statuses[secret.key] === 'saving'}
              className="px-4 py-2 bg-t-accent text-white text-xs font-semibold rounded-md hover:bg-t-accent disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {statuses[secret.key] === 'saving'
                ? 'Saving...'
                : statuses[secret.key] === 'success'
                ? 'Saved!'
                : existingSecrets.includes(secret.key)
                ? 'Update'
                : 'Save'}
            </button>
          </div>
          {errors[secret.key] && (
            <p className="text-t-error text-[11px] mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors[secret.key]}
            </p>
          )}
        </div>
      ))}

      {/* Info */}
      <div className="t-card rounded-lg p-5">
        <h3 className="text-t-bright text-sm font-semibold mb-2">How it works</h3>
        <ul className="text-t-muted text-[11px] space-y-1.5 list-disc list-inside">
          <li>Secrets are stored as encrypted Cloudflare Worker secrets — they never appear in code or logs.</li>
          <li>Your CF API token is sent through a same-origin proxy and is not persisted anywhere.</li>
          <li>After saving, the worker will use the new values on its next invocation (no redeploy needed).</li>
          <li>DataForSEO is a paid API — <a href="https://dataforseo.com" target="_blank" rel="noopener" className="text-t-accent hover:underline">check your usage</a> to avoid surprise charges.</li>
        </ul>
      </div>
    </PanelShell>
  );
}

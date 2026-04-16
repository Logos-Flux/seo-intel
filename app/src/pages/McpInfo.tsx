import { PanelShell } from '@/components/ui/PanelShell';
import { Badge } from '@/components/ui/Badge';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

const MCP_URL = import.meta.env.VITE_MCP_URL || '/mcp';

const tools = [
  { name: 'seo_intel_list_profiles', desc: 'List all company profiles', category: 'Profiles' },
  { name: 'seo_intel_get_profile', desc: 'Get details for a specific profile', category: 'Profiles' },
  { name: 'seo_intel_intake', desc: 'Run full SEO intake for a domain (15-30s)', category: 'Intake' },
  { name: 'seo_intel_keywords', desc: 'Get keywords with volume, difficulty, intent', category: 'SEO Data' },
  { name: 'seo_intel_competitors', desc: 'Get competitor traffic/keyword snapshots', category: 'SEO Data' },
  { name: 'seo_intel_gaps', desc: 'Keyword gaps vs a competitor', category: 'SEO Data' },
  { name: 'seo_intel_ranked', desc: 'Keywords the domain currently ranks for', category: 'SEO Data' },
  { name: 'seo_intel_serp', desc: 'Live SERP results for a keyword', category: 'SEO Data' },
  { name: 'seo_intel_lighthouse', desc: 'Lighthouse audit (performance, SEO, a11y)', category: 'Analysis' },
  { name: 'seo_intel_tech', desc: 'Detect domain tech stack', category: 'Analysis' },
  { name: 'seo_intel_report', desc: 'Generate shareable client report URL', category: 'Reports' },
];

const categories = [...new Set(tools.map((t) => t.category))];

const claudeCodeConfig = `{
  "mcpServers": {
    "seo-intel": {
      "type": "url",
      "url": "${MCP_URL}"
    }
  }
}`;

const claudeDesktopConfig = `{
  "mcpServers": {
    "seo-intel": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${MCP_URL}"]
    }
  }
}`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-bridge-muted text-[10px] hover:text-bridge-bright transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-bridge-success" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function McpInfo() {
  return (
    <PanelShell
      title="MCP Server"
      subtitle="Connect to SEO Intel from any MCP client"
    >
      {/* Connection info */}
      <div className="bridge-card rounded-lg p-5">
        <h3 className="text-bridge-bright text-sm font-semibold mb-3">Endpoint</h3>
        <div className="flex items-center justify-between bg-bridge-surface rounded-md px-4 py-2.5 border border-bridge-border">
          <code className="text-eva-green text-xs">{MCP_URL}</code>
          <CopyButton text={MCP_URL} />
        </div>
      </div>

      {/* Setup configs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bridge-card rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-bridge-bright text-sm font-semibold">Claude Code</h3>
            <CopyButton text={claudeCodeConfig} />
          </div>
          <p className="text-bridge-muted text-[10px] mb-2">Add to <code className="text-eva-purple">.mcp.json</code> in your project root:</p>
          <pre className="bg-bridge-surface rounded-md p-3 text-[11px] text-bridge-text overflow-x-auto border border-bridge-border">
            {claudeCodeConfig}
          </pre>
        </div>

        <div className="bridge-card rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-bridge-bright text-sm font-semibold">Claude Desktop</h3>
            <CopyButton text={claudeDesktopConfig} />
          </div>
          <p className="text-bridge-muted text-[10px] mb-2">Add to <code className="text-eva-purple">claude_desktop_config.json</code>:</p>
          <pre className="bg-bridge-surface rounded-md p-3 text-[11px] text-bridge-text overflow-x-auto border border-bridge-border">
            {claudeDesktopConfig}
          </pre>
        </div>
      </div>

      {/* Available tools */}
      <div className="bridge-card rounded-lg p-5">
        <h3 className="text-bridge-bright text-sm font-semibold mb-4">Available Tools ({tools.length})</h3>
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-bridge-muted text-[9px] uppercase tracking-wider mb-2">{cat}</p>
              <div className="space-y-1.5">
                {tools.filter((t) => t.category === cat).map((tool) => (
                  <div key={tool.name} className="flex items-center justify-between py-1.5 border-b border-bridge-border/20 last:border-0">
                    <code className="text-eva-purple text-xs">{tool.name}</code>
                    <span className="text-bridge-muted text-[11px]">{tool.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example usage */}
      <div className="bridge-card rounded-lg p-5">
        <h3 className="text-bridge-bright text-sm font-semibold mb-3">Example: Full Intake Flow</h3>
        <pre className="bg-bridge-surface rounded-md p-4 text-[11px] text-bridge-text overflow-x-auto border border-bridge-border whitespace-pre-wrap">{`# 1. Run intake for a new domain
seo_intel_intake(domain: "acmesolar.com", name: "Acme Solar")
→ { profile_id: "abc-123", status: "complete", summary: { keywords: 247, competitors: 6, ... } }

# 2. Get their keywords
seo_intel_keywords(profile_id: "abc-123")
→ { count: 247, keywords: [{ keyword: "solar panels", volume: 14800, difficulty: 42, ... }] }

# 3. Check gaps vs a competitor
seo_intel_gaps(profile_id: "abc-123", competitor_domain: "competitor.com")
→ { count: 83, gaps: [{ keyword: "solar battery backup", volume: 8100, ... }] }

# 4. Generate a shareable report
seo_intel_report(profile_id: "abc-123")
→ { url: "https://your-app.pages.dev/report/uuid-token", expires_at: "2026-05-01" }`}</pre>
      </div>
    </PanelShell>
  );
}

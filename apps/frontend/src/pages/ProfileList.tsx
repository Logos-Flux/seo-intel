import { useProfile } from '@/hooks/useProfile';
import { Link } from 'react-router-dom';
import { PanelShell } from '@/components/ui/PanelShell';
import {
  Plus, Globe, Trash2, LayoutDashboard, Search, Users, GitCompare,
  ListOrdered, Award, Gauge, Code, Network, Zap, Settings, Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';

const FEATURES = [
  {
    icon: Zap,
    title: 'Intake Wizard',
    description: 'Onboard a new domain in one click. Discovers ranked keywords, expands with suggestions and related terms, enriches with difficulty, intent, and volume data.',
    color: 'text-t-accent',
    path: 'intake',
    needsProfile: false,
    staticPath: '/intake/new',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'At-a-glance overview of your SEO profile — tracked keywords, estimated traffic, competitor count, and average ranking position.',
    color: 'text-t-info',
    path: '',
    needsProfile: true,
  },
  {
    icon: Search,
    title: 'Keywords',
    description: 'Full keyword database with search volume, difficulty, intent, CPC, and competition level. Filter by cluster to focus on specific topic areas.',
    color: 'text-t-info',
    path: 'keywords',
    needsProfile: true,
  },
  {
    icon: Users,
    title: 'Competitors',
    description: 'AI-powered competitor discovery using Gemini. Review, add, or remove competitors, then pull organic traffic, keyword counts, and backlink data from DataForSEO.',
    color: 'text-t-info',
    path: 'competitors',
    needsProfile: true,
  },
  {
    icon: GitCompare,
    title: 'Gap Analysis',
    description: 'Find keywords your competitors rank for that you don\'t. Identify opportunities by comparing positions, volume, and competition level.',
    color: 'text-t-info',
    path: 'gaps',
    needsProfile: true,
  },
  {
    icon: ListOrdered,
    title: 'SERP Checker',
    description: 'Live Google search results for any keyword. See who ranks in the top 20, with your position highlighted if you\'re in the results.',
    color: 'text-t-info',
    path: 'serp',
    needsProfile: true,
  },
  {
    icon: Award,
    title: 'Ranked Keywords',
    description: 'All keywords your domain currently ranks for in Google organic search, sorted by position. Includes volume and estimated traffic value.',
    color: 'text-t-info',
    path: 'ranked',
    needsProfile: true,
  },
  {
    icon: Gauge,
    title: 'Lighthouse Audit',
    description: 'Run Google Lighthouse audits on your domain. Performance, accessibility, best practices, and SEO scores with Core Web Vitals (FCP, LCP, CLS, TBT).',
    color: 'text-t-info',
    path: 'lighthouse',
    needsProfile: true,
  },
  {
    icon: Code,
    title: 'Tech Stack',
    description: 'Detect the technologies used by your domain — CMS, frameworks, analytics, CDNs, and more.',
    color: 'text-t-info',
    path: 'tech',
    needsProfile: true,
  },
  {
    icon: Network,
    title: 'Keyword Clusters (Alpha)',
    description: 'Semantic keyword clustering powered by AI. Enter a seed keyword and get 10+ organized clusters with head terms, category keywords, and long-tails — all enriched with real search data. Export to XLSX.',
    color: 'text-t-accent',
    path: 'clusters',
    needsProfile: true,
  },
  {
    icon: Settings,
    title: 'Settings',
    description: 'Configure API credentials (DataForSEO, Cloudflare AI Gateway) stored as encrypted Cloudflare Worker secrets. Manage everything from the browser.',
    color: 'text-t-muted',
    path: 'settings',
    needsProfile: false,
    staticPath: '/settings',
  },
];

export function ProfileList() {
  const { profiles, loading, refreshProfiles } = useProfile();

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${name}" and all its data? This cannot be undone.`)) return;
    await api.deleteProfile(id);
    await refreshProfiles();
  };

  return (
    <PanelShell
      title="SEO Intel"
      subtitle="Intelligence Dashboard"
      actions={
        <Link to="/intake/new" className="flex items-center gap-1.5 bg-t-accent text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-t-accent transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Profile
        </Link>
      }
    >
      {/* Hero */}
      <div className="rounded-lg p-6 bg-gradient-to-br from-t-bright to-t-text text-white border border-white/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-t-accent/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-t-accent" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold mb-1">Competitive SEO Intelligence</h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
              Research keywords, discover competitors with AI, track rankings, audit site performance, and build semantic keyword clusters — all from one dashboard. Powered by DataForSEO and Cloudflare AI Gateway.
            </p>
            {profiles.length === 0 && (
              <Link to="/intake/new" className="inline-flex items-center gap-1.5 mt-4 bg-t-accent text-white rounded-md px-4 py-2 text-xs font-semibold hover:bg-t-accent transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create Your First Profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Profiles */}
      {loading ? (
        <p className="text-t-muted text-sm">Loading profiles...</p>
      ) : profiles.length > 0 && (
        <>
          <h3 className="text-t-bright text-sm font-semibold">Profiles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {profiles.map((p) => (
              <Link key={p.id} to={`/${p.id}`} className="t-card rounded-lg p-4 hover:border-t-accent/40 transition-colors relative group">
                <button
                  onClick={(e) => handleDelete(e, p.id, p.name)}
                  className="absolute top-3 right-3 p-1.5 rounded-md text-t-muted opacity-0 group-hover:opacity-100 hover:text-t-error hover:bg-t-error/10 transition-all"
                  title="Delete profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-md bg-t-accent/10 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-t-accent" />
                  </div>
                  <div>
                    <h3 className="text-t-bright text-sm font-semibold">{p.name}</h3>
                    <p className="text-t-accent text-[10px]">{p.domain}</p>
                  </div>
                </div>
                <p className="text-t-muted text-[10px]">
                  Created {new Date(p.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Feature Guide */}
      <div className="pt-2">
        <h3 className="text-t-bright text-sm font-semibold mb-3">How It Works</h3>
        <p className="text-t-muted text-xs mb-4 max-w-2xl">
          Start by creating a profile with the Intake Wizard. It automatically discovers your keywords and rankings. Then use the tools below to analyze competitors, find keyword gaps, audit performance, and build content clusters.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FEATURES.map((feature) => {
            const firstProfile = profiles[0];
            const to = feature.needsProfile
              ? firstProfile ? `/${firstProfile.id}/${feature.path}` : '/intake/new'
              : (feature as any).staticPath ?? `/${feature.path}`;

            return (
            <Link key={feature.title} to={to} className="t-card rounded-lg p-4 flex items-start gap-3 hover:border-t-accent/30 transition-colors">
              <div className={`shrink-0 mt-0.5 ${feature.color}`}>
                <feature.icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-t-bright text-xs font-semibold mb-0.5">{feature.title}</h4>
                <p className="text-t-muted text-[11px] leading-relaxed">{feature.description}</p>
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </PanelShell>
  );
}

import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import {
  LayoutDashboard, Search, Users, GitCompare, ListOrdered, Award, Link2,
  Zap, FileText, TrendingUp, Gauge, ChevronDown, FolderOpen, Plus, Network, Code, Plug,
} from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profiles, activeProfile, setActiveProfileId } = useProfile();

  const profileId = activeProfile?.id;
  const basePath = profileId ? `/app/${profileId}` : '/app';

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: basePath },
    { label: 'Keywords', icon: Search, path: `${basePath}/keywords` },
    { label: 'Competitors', icon: Users, path: `${basePath}/competitors` },
    { label: 'Gap Analysis', icon: GitCompare, path: `${basePath}/gaps` },
    { label: 'SERP Checker', icon: ListOrdered, path: `${basePath}/serp` },
    { label: 'Ranked Keywords', icon: Award, path: `${basePath}/ranked` },
    { label: 'Lighthouse', icon: Gauge, path: `${basePath}/lighthouse` },
    { label: 'Tech Stack', icon: Code, path: `${basePath}/tech` },
  ];

  const toolItems = [
    { label: 'Intake Wizard', icon: Zap, path: `${basePath}/intake`, accent: 'text-bridge-warning' },
    { label: 'Reports', icon: FileText, path: `${basePath}/reports`, accent: 'text-bridge-info' },
    { label: 'MCP Server', icon: Plug, path: '/app/mcp', accent: 'text-eva-purple' },
  ];

  const comingSoon = [
    { label: 'Backlinks', icon: Link2 },
    { label: 'Keyword Clusters', icon: Network },
    { label: 'Historical Trends', icon: TrendingUp },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-gradient-to-b from-bridge-surface to-bridge-deep border-r border-bridge-border h-dvh">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-bridge-border">
        <Link to="/app" className="text-eva-green font-display text-sm tracking-widest">SEO INTEL</Link>
        <p className="text-bridge-muted text-[10px] mt-0.5">Competitive Intelligence</p>
      </div>

      {/* Profile Switcher */}
      {activeProfile && (
        <div className="px-4 py-3 border-b border-bridge-border">
          <p className="text-bridge-muted text-[9px] uppercase tracking-wider mb-1.5">Active Profile</p>
          <div className="relative">
            <select
              value={activeProfile.id}
              onChange={(e) => {
                setActiveProfileId(e.target.value);
                navigate(`/app/${e.target.value}`);
              }}
              className="w-full bg-eva-purple/10 border border-eva-purple/30 rounded-md px-3 py-2 text-bridge-bright text-xs appearance-none cursor-pointer focus:outline-none focus:border-eva-purple"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-bridge-muted pointer-events-none" />
          </div>
          <p className="text-eva-purple text-[10px] mt-1">{activeProfile.domain}</p>
          <div className="flex gap-2 mt-2">
            <Link to="/app" className="flex items-center gap-1 text-bridge-muted text-[10px] hover:text-bridge-bright transition-colors">
              <FolderOpen className="w-3 h-3" /> All Profiles
            </Link>
            <Link to="/app/intake/new" className="flex items-center gap-1 text-eva-green text-[10px] hover:text-eva-green/80 transition-colors">
              <Plus className="w-3 h-3" /> New
            </Link>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              isActive(item.path)
                ? 'text-eva-green bg-eva-green/8 border-l-2 border-eva-green'
                : 'text-bridge-text hover:text-bridge-bright hover:bg-bridge-hover border-l-2 border-transparent'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}

        <div className="px-4 mt-4 mb-1">
          <p className="text-bridge-muted text-[9px] uppercase tracking-wider">Tools</p>
        </div>
        {toolItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              isActive(item.path)
                ? `${item.accent} bg-bridge-hover border-l-2 border-current`
                : `${item.accent} opacity-80 hover:opacity-100 hover:bg-bridge-hover border-l-2 border-transparent`
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}

        <div className="px-4 mt-4 mb-1">
          <p className="text-bridge-muted text-[9px] uppercase tracking-wider">Coming Soon</p>
        </div>
        {comingSoon.map((item) => (
          <div key={item.label} className="flex items-center gap-2 px-4 py-2 text-xs text-bridge-muted cursor-not-allowed">
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-bridge-border">
        <p className="text-bridge-muted text-[10px]">{profiles.length} profiles</p>
      </div>
    </aside>
  );
}

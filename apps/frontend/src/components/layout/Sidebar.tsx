import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import {
  LayoutDashboard, Search, Users, GitCompare, ListOrdered, Award, Link2,
  Zap, Gauge, ChevronDown, FolderOpen, Plus, Network, Code, Settings,
  TrendingUp, FileText, Plug, Bug, BarChart3, ShoppingCart, MapPin, Layers, Eye, Target,
} from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profiles, activeProfile, setActiveProfileId } = useProfile();

  const profileId = activeProfile?.id;
  const basePath = profileId ? `/${profileId}` : '/';

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: basePath },
    { label: 'Keywords', icon: Search, path: `${basePath}/keywords` },
    { label: 'Competitors', icon: Users, path: `${basePath}/competitors` },
    { label: 'Gap Analysis', icon: GitCompare, path: `${basePath}/gaps` },
    { label: 'SERP Checker', icon: ListOrdered, path: `${basePath}/serp` },
    { label: 'Ranked Keywords', icon: Award, path: `${basePath}/ranked` },
    { label: 'Lighthouse', icon: Gauge, path: `${basePath}/lighthouse` },
    { label: 'Clusters (Alpha)', icon: Network, path: `${basePath}/clusters` },
  ];

  const toolItems = [
    { label: 'Intake Wizard', icon: Zap, path: `${basePath}/intake` },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const comingSoon = [
    { label: 'Reports', icon: FileText },
    { label: 'MCP Server', icon: Plug },
    { label: 'Tech Stack', icon: Code },
    { label: 'Backlinks', icon: Link2 },
    { label: 'Historical Trends', icon: TrendingUp },
    { label: 'Search Console', icon: Search },
    { label: 'GA4', icon: BarChart3 },
    { label: 'Google Merchant', icon: ShoppingCart },
    { label: 'Business Profile', icon: MapPin },
    { label: 'Crawler', icon: Bug },
    { label: 'Adv. Rank Tracking', icon: Target },
    { label: 'Semantic Layer', icon: Layers },
    { label: 'AI Visibility', icon: Eye },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="flex h-full w-full flex-col bg-t-bright">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <Link to="/" className="font-display text-base tracking-tight text-white">
          SEO Intel
        </Link>
        <p className="text-t-accent-alt text-[10px] font-medium mt-0.5 tracking-wide uppercase">Intelligence Dashboard</p>
      </div>

      {/* Profile Switcher */}
      {activeProfile && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1.5">Active Profile</p>
          <div className="relative">
            <select
              value={activeProfile.id}
              onChange={(e) => {
                setActiveProfileId(e.target.value);
                navigate(`/${e.target.value}`);
              }}
              className="w-full bg-t-accent-alt/10 border border-t-accent-alt/30 rounded-md px-3 py-2 text-white text-xs appearance-none cursor-pointer focus:outline-none focus:border-t-accent-alt"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-white/40 pointer-events-none" />
          </div>
          <p className="text-t-accent-alt text-[10px] mt-1">{activeProfile.domain}</p>
          <div className="flex gap-2 mt-2">
            <Link to="/" className="flex items-center gap-1 text-white/50 text-[10px] hover:text-white transition-colors">
              <FolderOpen className="w-3 h-3" /> All Profiles
            </Link>
            <Link to="/intake/new" className="flex items-center gap-1 text-t-accent-alt text-[10px] hover:opacity-80 transition-colors">
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
                ? 'text-t-accent-alt bg-t-accent-alt/10 border-l-2 border-t-accent-alt'
                : 'text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}

        <div className="px-4 mt-4 mb-1">
          <p className="text-white/30 text-[9px] uppercase tracking-wider">Tools</p>
        </div>
        {toolItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
              isActive(item.path)
                ? 'text-t-accent-alt bg-t-accent-alt/10 border-l-2 border-t-accent-alt'
                : 'text-white/60 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}

        <div className="px-4 mt-4 mb-1">
          <p className="text-white/30 text-[9px] uppercase tracking-wider">Coming Soon</p>
        </div>
        {comingSoon.map((item) => (
          <div key={item.label} className="flex items-center gap-2 px-4 py-2 text-xs text-white/20 cursor-not-allowed">
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </div>
        ))}

      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-white/30 text-[10px]">{profiles.length} profiles</p>
      </div>
    </aside>
  );
}

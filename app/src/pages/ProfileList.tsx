import { useProfile } from '@/hooks/useProfile';
import { Link } from 'react-router-dom';
import { PanelShell } from '@/components/ui/PanelShell';
import { Plus, Globe, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

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
      title="Company Profiles"
      subtitle={`${profiles.length} profiles`}
      actions={
        <Link to="/app/intake/new" className="flex items-center gap-1.5 bg-eva-green/15 border border-eva-green/30 rounded-md px-3 py-1.5 text-eva-green text-xs hover:bg-eva-green/25 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Profile
        </Link>
      }
    >
      {loading ? (
        <p className="text-bridge-muted text-sm">Loading profiles...</p>
      ) : profiles.length === 0 ? (
        <div className="bridge-card rounded-lg p-12 text-center">
          <Globe className="w-10 h-10 text-bridge-muted mx-auto mb-3" />
          <p className="text-bridge-text text-sm">No profiles yet.</p>
          <p className="text-bridge-muted text-xs mt-1">Create one to get started with SEO analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <Link key={p.id} to={`/app/${p.id}`} className="bridge-card rounded-lg p-4 hover:border-eva-purple/40 transition-colors relative group">
              <button
                onClick={(e) => handleDelete(e, p.id, p.name)}
                className="absolute top-3 right-3 p-1.5 rounded-md text-bridge-muted opacity-0 group-hover:opacity-100 hover:text-bridge-error hover:bg-bridge-error/10 transition-all"
                title="Delete profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-eva-purple/15 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-eva-purple" />
                </div>
                <div>
                  <h3 className="text-bridge-bright text-sm font-semibold">{p.name}</h3>
                  <p className="text-eva-purple text-[10px]">{p.domain}</p>
                </div>
              </div>
              <p className="text-bridge-muted text-[10px]">
                Created {new Date(p.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface ProfileContextValue {
  profiles: any[];
  activeProfile: any | null;
  setActiveProfileId: (id: string) => void;
  loading: boolean;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue>({
  profiles: [],
  activeProfile: null,
  setActiveProfileId: () => {},
  loading: true,
  refreshProfiles: async () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfiles = async () => {
    const { profiles: list } = await api.listProfiles();
    setProfiles(list);
    if (!activeId && list.length > 0) setActiveId(list[0].id);
    setLoading(false);
  };

  useEffect(() => { refreshProfiles(); }, []);

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, setActiveProfileId: setActiveId, loading, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);

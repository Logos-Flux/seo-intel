import { Outlet } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { UserMenu } from '@/components/shell/UserMenu';
import { Sidebar } from './Sidebar';
import { ProfileProvider } from '@/hooks/useProfile';

export function AdminLayout() {
  return (
    <ProfileProvider>
      <AppShell appId="seo" drawer={<Sidebar />} topNavEndSlot={<UserMenu />}>
        <div className="h-full overflow-y-auto p-6">
          <Outlet />
        </div>
      </AppShell>
    </ProfileProvider>
  );
}

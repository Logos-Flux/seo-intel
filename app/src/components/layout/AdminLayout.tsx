import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ProfileProvider } from '@/hooks/useProfile';

export function AdminLayout() {
  return (
    <ProfileProvider>
      <div className="flex h-dvh bg-bridge-deep">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </ProfileProvider>
  );
}

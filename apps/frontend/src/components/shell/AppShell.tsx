import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AppShellProps {
  children: ReactNode;
  drawer?: ReactNode;
  topNavEndSlot?: ReactNode;
  /** Reserved — kept for API parity with hosted shells that key behaviour off the app id. */
  appId?: string;
}

export function AppShell({ children, drawer, topNavEndSlot }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <Link to="/" className="text-sm font-semibold tracking-tight text-slate-900">
          SEO Intel
        </Link>
        <div className="flex items-center gap-2">{topNavEndSlot}</div>
      </header>
      <div className="flex min-h-0 flex-1">
        {drawer ? (
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
            {drawer}
          </aside>
        ) : null}
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

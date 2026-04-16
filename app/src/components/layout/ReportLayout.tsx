import { Outlet } from 'react-router-dom';

export function ReportLayout() {
  return (
    <div className="min-h-dvh bg-bridge-deep">
      <Outlet />
    </div>
  );
}

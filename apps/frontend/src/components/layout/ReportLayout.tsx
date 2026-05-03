import { Outlet } from 'react-router-dom';

export function ReportLayout() {
  return (
    <div className="min-h-dvh bg-t-deep">
      <Outlet />
    </div>
  );
}

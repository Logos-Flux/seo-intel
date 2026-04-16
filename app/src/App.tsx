import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ReportLayout } from '@/components/layout/ReportLayout';
import { ProfileList } from '@/pages/ProfileList';
import { Dashboard } from '@/pages/Dashboard';
import { Keywords } from '@/pages/Keywords';
import { Competitors } from '@/pages/Competitors';
import { GapAnalysis } from '@/pages/GapAnalysis';
import { SerpChecker } from '@/pages/SerpChecker';
import { RankedKeywords } from '@/pages/RankedKeywords';
import { Reports } from '@/pages/Reports';
import { IntakeWizard } from '@/pages/IntakeWizard';
import { ClientReport } from '@/pages/ClientReport';
import { Lighthouse } from '@/pages/Lighthouse';
import { TechStack } from '@/pages/TechStack';
import { McpInfo } from '@/pages/McpInfo';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin shell */}
        <Route path="/app" element={<AdminLayout />}>
          <Route index element={<ProfileList />} />
          <Route path="intake/new" element={<IntakeWizard />} />
          <Route path="mcp" element={<McpInfo />} />
          <Route path=":profileId" element={<Dashboard />} />
          <Route path=":profileId/keywords" element={<Keywords />} />
          <Route path=":profileId/competitors" element={<Competitors />} />
          <Route path=":profileId/gaps" element={<GapAnalysis />} />
          <Route path=":profileId/serp" element={<SerpChecker />} />
          <Route path=":profileId/ranked" element={<RankedKeywords />} />
          <Route path=":profileId/lighthouse" element={<Lighthouse />} />
          <Route path=":profileId/tech" element={<TechStack />} />
          <Route path=":profileId/intake" element={<IntakeWizard />} />
          <Route path=":profileId/reports" element={<Reports />} />
        </Route>

        {/* Client report shell */}
        <Route path="/report" element={<ReportLayout />}>
          <Route path=":token" element={<ClientReport />} />
        </Route>

        {/* Redirect root to app */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

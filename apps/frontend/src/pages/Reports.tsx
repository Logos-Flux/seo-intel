import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { PanelShell } from '@/components/ui/PanelShell';
import { FileText, Loader, CheckCircle, Copy, ExternalLink } from 'lucide-react';

interface GeneratedReport {
  report_id: string;
  token: string;
  url: string;
}

export function Reports() {
  const { profileId } = useParams();
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!profileId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generateReport(profileId);
      setReports((prev) => [res, ...prev]);
    } catch (err) {
      setError(String(err));
    }
    setGenerating(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const reportUrl = (token: string) => `${window.location.origin}/report/${token}`;

  return (
    <PanelShell
      title="Reports"
      subtitle="Generate and share client reports"
      actions={
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 bg-t-accent-alt/15 border border-t-accent-alt/30 rounded-md px-3 py-1.5 text-t-accent-alt text-xs hover:bg-t-accent-alt/25 transition-colors disabled:opacity-50"
        >
          {generating ? (
            <Loader className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
      }
    >
      {error && (
        <div className="t-card rounded-lg p-4 border-t-error/30">
          <p className="text-t-error text-xs">{error}</p>
        </div>
      )}

      {reports.length === 0 && !generating ? (
        <div className="t-card rounded-lg p-12 text-center">
          <FileText className="w-10 h-10 text-t-muted mx-auto mb-3" />
          <p className="text-t-text text-sm">No reports generated yet.</p>
          <p className="text-t-muted text-xs mt-1">Click "Generate Report" to create a shareable client report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.report_id} className="t-card rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-t-success" />
                  <div>
                    <p className="text-t-bright text-xs font-semibold">Report Generated</p>
                    <p className="text-t-muted text-[10px]">ID: {report.report_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(reportUrl(report.token), report.report_id)}
                    className="flex items-center gap-1 bg-t-surface border border-t-border rounded-md px-2.5 py-1.5 text-t-text text-[10px] hover:border-t-border-active transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {copied === report.report_id ? 'Copied!' : 'Copy Link'}
                  </button>
                  <a
                    href={reportUrl(report.token)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-t-info/15 border border-t-info/30 rounded-md px-2.5 py-1.5 text-t-info text-[10px] hover:bg-t-info/25 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                </div>
              </div>
              <p className="text-t-muted text-[10px] mt-2 font-mono">{reportUrl(report.token)}</p>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

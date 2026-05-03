interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: 'amber' | 'green' | 'info' | 'warning' | 'purple';
}

const subtitleColors: Record<string, string> = {
  amber: 'text-t-accent',
  purple: 'text-t-accent',
  green: 'text-t-success',
  info: 'text-t-info',
  warning: 'text-t-warning',
};

export function StatCard({ title, value, subtitle, accentColor = 'info' }: Props) {
  return (
    <div className="t-card rounded-lg p-4">
      <p className="text-t-muted text-[10px] uppercase tracking-wider">{title}</p>
      <p className="text-t-bright text-2xl font-bold font-display mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {subtitle && <p className={`text-[10px] mt-1 ${subtitleColors[accentColor]}`}>{subtitle}</p>}
    </div>
  );
}

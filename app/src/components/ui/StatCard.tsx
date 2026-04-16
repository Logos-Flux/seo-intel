interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: 'purple' | 'green' | 'info' | 'warning';
}

const subtitleColors: Record<string, string> = {
  purple: 'text-eva-purple',
  green: 'text-bridge-success',
  info: 'text-bridge-info',
  warning: 'text-bridge-warning',
};

export function StatCard({ title, value, subtitle, accentColor = 'info' }: Props) {
  return (
    <div className="bridge-card rounded-lg p-4">
      <p className="text-bridge-muted text-[10px] uppercase tracking-wider">{title}</p>
      <p className="text-bridge-bright text-2xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {subtitle && <p className={`text-[10px] mt-1 ${subtitleColors[accentColor]}`}>{subtitle}</p>}
    </div>
  );
}

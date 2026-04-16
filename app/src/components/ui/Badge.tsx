interface Props {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'muted';
}

const variants: Record<string, string> = {
  success: 'bg-bridge-success/10 text-bridge-success',
  warning: 'bg-bridge-warning/10 text-bridge-warning',
  error: 'bg-bridge-error/10 text-bridge-error',
  info: 'bg-bridge-info/10 text-bridge-info',
  muted: 'bg-bridge-muted/10 text-bridge-muted',
};

export function Badge({ label, variant }: Props) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${variants[variant]}`}>
      {label}
    </span>
  );
}

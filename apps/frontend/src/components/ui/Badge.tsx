interface Props {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'muted';
}

const variants: Record<string, string> = {
  success: 'bg-t-success/10 text-t-success',
  warning: 'bg-t-warning/10 text-t-warning',
  error: 'bg-t-error/10 text-t-error',
  info: 'bg-t-info/10 text-t-info',
  muted: 'bg-t-muted/10 text-t-muted',
};

export function Badge({ label, variant }: Props) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${variants[variant]}`}>
      {label}
    </span>
  );
}

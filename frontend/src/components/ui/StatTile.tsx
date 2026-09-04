import { HelpLink } from '@/components/admin/HelpButton';

export default function StatTile({
  helpKey,
  label,
  value,
  href,
  hint,
}: {
  helpKey: string;
  label: string;
  value: number | string | null;
  href?: string;
  hint?: string;
}) {
  const inner = (
    <div className="card-panel h-full hover:bg-gray-50">
      <p className="text-3xl font-bold tabular-nums">{value == null ? '—' : value}</p>
      <p className="text-sm font-medium text-gray-800 mt-1">{label}</p>
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  );
  if (!href) return inner;
  return (
    <HelpLink helpKey={helpKey} href={href} className="block h-full">
      {inner}
    </HelpLink>
  );
}

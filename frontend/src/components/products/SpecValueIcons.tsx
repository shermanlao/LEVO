import {
  cctSwatchColors,
  finishSwatchColors,
  formatBeamLabel,
  parseBeamDegrees,
} from '@shared/spec-icons';

const SWATCH = 'inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300';
const ROW = 'inline-flex items-center gap-1.5';

function ColorSwatch({ colors }: { colors: string[] }) {
  if (!colors.length) return null;
  const background =
    colors.length === 1
      ? colors[0]
      : `conic-gradient(${colors
          .map((color, index) => {
            const start = (index / colors.length) * 360;
            const end = ((index + 1) / colors.length) * 360;
            return `${color} ${start}deg ${end}deg`;
          })
          .join(', ')})`;
  return <span aria-hidden className={SWATCH} style={{ background }} />;
}

export function BeamSpreadIcon({
  degrees,
  className = 'h-4 w-4 text-gray-500',
}: {
  degrees: number | null;
  className?: string;
}) {
  const deg = degrees && degrees > 0 ? Math.min(Math.max(degrees, 8), 160) : 36;
  const half = Math.min(10.5, Math.max(1.4, Math.tan((deg * Math.PI) / 360) * 14));
  const cx = 12;
  const sourceY = 3.6;
  const baseY = 19.2;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx={cx} cy={sourceY} r="1.35" fill="currentColor" />
      <path
        d={`M${cx} ${sourceY + 1.5} L${cx - half} ${baseY} L${cx + half} ${baseY} Z`}
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CctSpecValue({ value }: { value?: string }) {
  if (!value) return <>—</>;
  return (
    <span className={ROW}>
      <ColorSwatch colors={cctSwatchColors(value)} />
      <span>{value}</span>
    </span>
  );
}

export function BeamSpecValue({ value }: { value?: string }) {
  if (!value) return <>—</>;
  return (
    <span className={ROW}>
      <BeamSpreadIcon degrees={parseBeamDegrees(value)} />
      <span>{formatBeamLabel(value)}</span>
    </span>
  );
}

export function FinishSpecValue({ value }: { value?: string }) {
  if (!value) return <>—</>;
  return (
    <span className={ROW}>
      <ColorSwatch colors={finishSwatchColors(value)} />
      <span>{value}</span>
    </span>
  );
}

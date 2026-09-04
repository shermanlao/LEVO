import { formatSpecValue } from '@/lib/product-specs';
import { toPublicImagePath } from '@/lib/image-utils';
import { mergeDatasheetLabelSlots, type DatasheetLabel } from '@shared/datasheet-labels';

export default function DatasheetSpecBadges({
  specs,
  labels,
}: {
  specs: Record<string, unknown>;
  labels?: DatasheetLabel[];
}) {
  const badges = mergeDatasheetLabelSlots(labels || [], {
    ip_rating: formatSpecValue(specs.ip_rating) || '',
    warranty: formatSpecValue(specs.warranty) || '',
    input_voltage: formatSpecValue(specs.input_voltage) || '',
  }).filter((label) => label.image || label.text);
  if (!badges.length) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-1" aria-label="Product ratings">
      {badges.map((badge) => {
        const src = toPublicImagePath(badge.image);
        return (
          <li key={badge.key}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={badge.text || badge.key} className="h-8 w-8 object-contain" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center bg-black px-0.5 text-center text-[7px] font-bold leading-tight text-white">
                {badge.text}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

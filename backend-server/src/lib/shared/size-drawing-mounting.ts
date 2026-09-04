export function mountingNeedsCuthole(mounting: string | null | undefined): boolean {
  return /\b(recessed|recess|inground)\b/i.test((mounting ?? '').trim());
}

export type SizeDrawingMissingField = 'main_photo' | 'size' | 'cuthole';

export function getSizeDrawingMissingFields(input: {
  mainPhoto: string | null | undefined;
  size: string | null | undefined;
  mounting: string | null | undefined;
  cuthole: string | null | undefined;
}): SizeDrawingMissingField[] {
  const missing: SizeDrawingMissingField[] = [];
  const main = typeof input.mainPhoto === 'string' ? input.mainPhoto.trim() : String(input.mainPhoto || '').trim();
  const size = String(input.size ?? '').trim();
  const cuthole = String(input.cuthole ?? '').trim();
  if (!main) missing.push('main_photo');
  if (!size) missing.push('size');
  if (mountingNeedsCuthole(input.mounting) && !cuthole) missing.push('cuthole');
  return missing;
}

export function formatSizeDrawingMissingMessage(missing: SizeDrawingMissingField[]): string {
  const labels: Record<SizeDrawingMissingField, string> = {
    main_photo: 'Main photo',
    size: 'Size Dimensions',
    cuthole: 'Cut Hole Size (required for recessed / recess / inground mounting)',
  };
  return `Please complete the following before generating a size drawing:\n\n${missing
    .map((m) => `• ${labels[m]}`)
    .join('\n')}`;
}

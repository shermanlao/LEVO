import { parseDatasheetLabels } from './shared/datasheet-labels';

export function strapiMedia(url: string | null | undefined) {
  if (!url) return { data: null as null };
  return { data: { id: 0, attributes: { url } } };
}

export function serializeTypeEnvelope(
  type:
    | { id: number; name?: string; slug?: string; description?: string; datasheet_labels?: unknown }
    | null
    | undefined
) {
  if (!type) return undefined;
  return {
    data: {
      id: type.id,
      attributes: {
        name: type.name ?? '',
        slug: type.slug ?? '',
        description: type.description ?? '',
        datasheet_labels: parseDatasheetLabels(type.datasheet_labels),
      },
    },
  };
}

export function parseSpecs(value: unknown): Record<string, string> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

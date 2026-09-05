'use client';

import { useMemo, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import OptionTag from '@/components/ui/OptionTag';
import {
  DATASHEET_LABEL_SLOTS,
  extraLabelSelected,
  extraLabelsFromCatalog,
  toggleExtraLabel,
  type DatasheetLabel,
} from '@shared/datasheet-labels';
import type { VariantCatalogOption } from '@shared/series-options';

type EntityDatasheetLabelEditorProps = {
  labels: DatasheetLabel[];
  catalog: VariantCatalogOption[];
  onSave: (labels: DatasheetLabel[]) => Promise<void>;
  description?: string;
};

export default function EntityDatasheetLabelEditor({
  labels,
  catalog,
  onSave,
  description,
}: EntityDatasheetLabelEditorProps) {
  const extras = useMemo(() => extraLabelsFromCatalog(catalog), [catalog]);
  const slotKeys = useMemo(() => new Set<string>(DATASHEET_LABEL_SLOTS.map((slot) => slot.key)), []);
  const tags = useMemo(() => {
    const orphans = labels.filter(
      (label) =>
        !slotKeys.has(label.key) &&
        Boolean(label.text) &&
        !extras.some((extra) => extraLabelSelected([label], extra))
    );
    return [...extras, ...orphans];
  }, [extras, labels, slotKeys]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(extra: DatasheetLabel) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(toggleExtraLabel(labels, extra));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save label');
    }
    setBusy(false);
  }

  return (
    <div className="bg-white shadow-md rounded p-6 mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Datasheet labels</h2>
        <HelpButton helpKey="admin.product_series.datasheet_labels" type="button" className="text-xs text-gray-400">
          ?
        </HelpButton>
      </div>
      {description ? <p className="text-sm text-gray-500 mb-4">{description}</p> : null}
      {tags.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((extra) => {
            const selected = extraLabelSelected(labels, extra);
            return (
              <OptionTag
                key={extra.key}
                helpKey={selected ? 'admin.product_series.option_remove' : 'admin.product_series.option_pick'}
                selected={selected}
                onClick={() => void toggle(extra)}
              >
                {extra.text}
              </OptionTag>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No extra labels yet.{' '}
          <Button
            helpKey="admin.dash.link.variant_options"
            variant="ghost"
            href="/admin/variant-options"
            className="text-blue-600 hover:underline"
          >
            Create them on Variant
          </Button>
        </p>
      )}
      {tags.length ? (
        <p className="text-sm text-gray-500 mt-3">
          Need a new icon?{' '}
          <Button
            helpKey="admin.dash.link.variant_options"
            variant="ghost"
            href="/admin/variant-options"
            className="text-blue-600 hover:underline"
          >
            Create it on Variant
          </Button>
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
    </div>
  );
}

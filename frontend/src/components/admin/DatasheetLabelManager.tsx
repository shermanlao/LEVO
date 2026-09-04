'use client';

import { useMemo, useState } from 'react';
import DatasheetLabelAiDialog from '@/components/ai/DatasheetLabelAiDialog';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { SelectField, TextInput } from '@/components/ui/FormField';
import { adminFetchJson, uploadAdminImage } from '@/lib/admin-fetch';
import { imageUrlToDataUrl } from '@/lib/sizeDrawingCropClient';
import { storedProductImagePath, toPublicImagePath } from '@/lib/image-utils';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { IMAGE_FRAMES, validateImageFile } from '@/lib/image-frames';
import {
  CUSTOM_DATASHEET_LABEL_KIND,
  DATASHEET_LABEL_SLOTS,
  type DatasheetLabel,
} from '@shared/datasheet-labels';
import { type VariantCatalogOption } from '@shared/series-options';

type Slot = DatasheetLabel & { kind: string };

type DatasheetLabelManagerProps = {
  catalog: VariantCatalogOption[];
  onChanged: () => void;
};

function slotsFromCatalog(catalog: VariantCatalogOption[]): Slot[] {
  const slots: Slot[] = [];
  const used = new Set<string>();
  for (const field of DATASHEET_LABEL_SLOTS) {
    const options = catalog.filter((option) => option.kind === field.key);
    if (!options.length) {
      slots.push({ key: field.key, kind: field.key, text: '', image: null });
      continue;
    }
    for (const option of options) {
      const key = `${option.kind}:${option.value}`;
      used.add(key);
      slots.push({
        key,
        kind: option.kind,
        text: option.value,
        image: option.label_image || null,
      });
    }
  }
  for (const option of catalog) {
    if (option.kind !== CUSTOM_DATASHEET_LABEL_KIND) continue;
    const text = String(option.value || '').trim();
    if (!text) continue;
    const key = `${option.kind}:${option.value}`;
    used.add(key);
    slots.push({
      key,
      kind: option.kind,
      text,
      image: option.label_image || null,
    });
  }
  for (const option of catalog) {
    if (!option.label_image) continue;
    const key = `${option.kind}:${option.value}`;
    if (used.has(key) || DATASHEET_LABEL_SLOTS.some((field) => field.key === option.kind)) continue;
    if (option.kind === CUSTOM_DATASHEET_LABEL_KIND) continue;
    slots.push({
      key,
      kind: option.kind,
      text: option.value,
      image: option.label_image || null,
    });
  }
  return slots;
}

export default function DatasheetLabelManager({ catalog, onChanged }: DatasheetLabelManagerProps) {
  const slots = useMemo(() => slotsFromCatalog(catalog), [catalog]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiKey, setAiKey] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [customKind, setCustomKind] = useState<string>(DATASHEET_LABEL_SLOTS[0].key);
  const [draftText, setDraftText] = useState<Record<string, string>>({});
  const { requestCrop, cutboard } = useImageCutboard();

  const aiSlot = slots.find((slot) => slot.key === aiKey) || null;

  function slotText(slot: Slot): string {
    return (draftText[slot.key] ?? slot.text).trim();
  }

  async function upsertLabel(kind: string, value: string, image: string | null | undefined) {
    const saved = await adminFetchJson('/variant-options/label', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        value,
        ...(image !== undefined ? { label_image: image } : {}),
      }),
    });
    if (!saved.ok) throw new Error(saved.error);
    onChanged();
  }

  async function uploadFile(slot: Slot, file: File) {
    const text = slotText(slot);
    if (!text) {
      setError('Enter the option value before uploading a label.');
      return;
    }
    setBusy(slot.key);
    setError(null);
    const uploaded = await uploadAdminImage(file, { imageType: 'datasheet_label' });
    if (!uploaded.ok) {
      setError(uploaded.error);
      setBusy(null);
      return;
    }
    const fileInfo =
      (uploaded.data as { files?: Array<{ url?: string; filename?: string }> }).files?.[0] || uploaded.data;
    const path = storedProductImagePath({
      url: (fileInfo as { url?: string }).url,
      fileName: (fileInfo as { filename?: string }).filename,
    });
    try {
      await upsertLabel(slot.kind, text, path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save label');
    }
    setBusy(null);
  }

  async function clearImage(slot: Slot) {
    const text = slotText(slot);
    if (!text) return;
    setBusy(slot.key);
    setError(null);
    try {
      await upsertLabel(slot.kind, text, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear label');
    }
    setBusy(null);
  }

  async function addCustom() {
    const text = customText.trim();
    if (!text) return;
    setBusy('custom');
    setError(null);
    try {
      await upsertLabel(customKind, text, undefined);
      setCustomText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add label');
    }
    setBusy(null);
  }

  async function removeCustom(slot: Slot) {
    setBusy(slot.key);
    setError(null);
    try {
      const saved = await adminFetchJson('/variant-options/label', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: slot.kind, value: slot.text }),
      });
      if (!saved.ok) throw new Error(saved.error);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove label');
    }
    setBusy(null);
  }

  async function openAi(slot: Slot) {
    const text = slotText(slot);
    if (!text) {
      setError('Enter the option value before generating a label.');
      return;
    }
    setError(null);
    const src = toPublicImagePath(slot.image);
    setAiSource(src ? await imageUrlToDataUrl(src).catch(() => null) : null);
    setAiKey(slot.key);
  }

  return (
    <div className="bg-white shadow-md rounded p-6 mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Datasheet labels</h2>
        <HelpButton helpKey="admin.variant_options.datasheet_labels" type="button" className="text-xs text-gray-400">
          ?
        </HelpButton>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Create datasheet squares here: IP, warranty, and voltage option values, plus extra icons
        (CE, DALI). Series pages pick those extras as tags. Artwork is stored on the catalog option.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {slots.map((slot) => {
          const src = toPublicImagePath(slot.image);
          const title =
            DATASHEET_LABEL_SLOTS.find((item) => item.key === slot.kind)?.title ||
            (slot.kind === CUSTOM_DATASHEET_LABEL_KIND ? 'Custom' : slot.kind.replace(/_/g, ' '));
          const isCustom = slot.kind === CUSTOM_DATASHEET_LABEL_KIND;
          const text = slotText(slot);
          return (
            <div key={slot.key} className="border border-gray-200 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">{title}</span>
                {isCustom ? (
                  <Button
                    helpKey="admin.variant_options.label_remove"
                    variant="ghost"
                    className="text-xs text-red-600"
                    disabled={busy != null}
                    onClick={() => removeCustom(slot)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="relative h-24 bg-gray-50 rounded mb-2 overflow-hidden flex items-center justify-center">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-8 w-8 object-contain" />
                ) : text ? (
                  <span className="flex h-8 w-8 items-center justify-center bg-black px-0.5 text-center text-[7px] font-bold leading-tight text-white">
                    {text}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">No label</span>
                )}
              </div>
              {!slot.text ? (
                <TextInput
                  label="Option"
                  value={draftText[slot.key] || ''}
                  onChange={(e) => setDraftText((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                  placeholder={slot.kind === 'ip_rating' ? 'IP20' : 'Value'}
                />
              ) : (
                <p className="text-xs text-gray-500 mb-2 truncate" title={slot.text}>
                  {slot.text}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <label className="btn-secondary text-xs py-1 px-2 cursor-pointer">
                  {busy === slot.key ? 'Uploading…' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    data-help-key="admin.variant_options.label_upload"
                    disabled={busy != null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      const invalid = validateImageFile(file);
                      if (invalid) {
                        setError(invalid);
                        return;
                      }
                      void requestCrop(file, IMAGE_FRAMES.label).then((cropped) => {
                        if (cropped) uploadFile(slot, cropped);
                      });
                    }}
                  />
                </label>
                <Button
                  helpKey="admin.variant_options.label_ai"
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  disabled={busy != null || !text}
                  onClick={() => openAi(slot)}
                >
                  Generate by AI
                </Button>
                {src ? (
                  <Button
                    helpKey="admin.variant_options.label_clear"
                    variant="ghost"
                    className="text-xs text-red-600"
                    disabled={busy != null}
                    onClick={() => clearImage(slot)}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3 mt-4">
        <div className="w-40">
          <SelectField label="Kind" value={customKind} onChange={(e) => setCustomKind(e.target.value)}>
            {DATASHEET_LABEL_SLOTS.map((slot) => (
              <option key={slot.key} value={slot.key}>
                {slot.title}
              </option>
            ))}
            <option value={CUSTOM_DATASHEET_LABEL_KIND}>Custom icon</option>
          </SelectField>
        </div>
        <div className="min-w-[12rem] flex-1">
          <TextInput
            label="Add label option"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={customKind === CUSTOM_DATASHEET_LABEL_KIND ? 'e.g. CE or DALI' : 'e.g. IP44'}
          />
        </div>
        <Button
          helpKey="admin.variant_options.label_add"
          variant="secondary"
          disabled={busy != null || !customText.trim()}
          onClick={addCustom}
        >
          Add label
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
      {cutboard}
      <DatasheetLabelAiDialog
        open={Boolean(aiSlot)}
        text={aiSlot ? slotText(aiSlot) : ''}
        sourceDataUrl={aiSource}
        onClose={() => {
          setAiKey(null);
          setAiSource(null);
        }}
        onApply={async (file) => {
          if (!aiSlot) return;
          await uploadFile(aiSlot, file);
        }}
      />
    </div>
  );
}

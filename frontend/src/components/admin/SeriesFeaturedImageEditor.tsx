'use client';

import { useRef, useState } from 'react';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import ImageCutboard from '@/components/ui/ImageCutboard';
import { adminFetchJson, uploadAdminImage } from '@/lib/admin-fetch';
import { extractImageSrc, storedProductImagePath, toPublicImagePath } from '@/lib/image-utils';
import {
  SERIES_FEATURED_SLOTS,
  validateImageFile,
  type SeriesFeaturedSlot,
} from '@/lib/image-frames';

export type SeriesFeaturedPaths = {
  featured_image_source: string;
  featured_image: string;
  featured_image_page: string;
  featured_image_datasheet: string;
};

type WizardState = {
  step: number;
  src: string;
  fileName: string;
  slotOnly: boolean;
};

type SeriesFeaturedImageEditorProps = {
  paths: Partial<SeriesFeaturedPaths>;
  seriesSlug?: string;
  seriesId?: number;
  onChange: (next: Partial<SeriesFeaturedPaths>) => void;
  onError?: (message: string) => void;
};

export function seriesFeaturedPathsFromAttrs(attrs?: {
  featured_image?: unknown;
  featured_image_source?: unknown;
  featured_image_page?: unknown;
  featured_image_datasheet?: unknown;
} | null): Partial<SeriesFeaturedPaths> {
  return {
    featured_image_source: extractImageSrc(attrs?.featured_image_source),
    featured_image: extractImageSrc(attrs?.featured_image),
    featured_image_page: extractImageSrc(attrs?.featured_image_page),
    featured_image_datasheet: extractImageSrc(attrs?.featured_image_datasheet),
  };
}

async function uploadSeriesFile(file: File, seriesSlug?: string): Promise<string> {
  const uploaded = await uploadAdminImage(file, {
    imageType: 'featured',
    ...(seriesSlug ? { seriesSlug } : {}),
  });
  if (!uploaded.ok) throw new Error(uploaded.error);
  const raw = uploaded.data as {
    files?: Array<{ url?: string; filename?: string; filePath?: string; fileName?: string }>;
    filePath?: string;
    url?: string;
    fileName?: string;
    filename?: string;
    name?: string;
  };
  const fileInfo = raw.files?.[0] || raw;
  const path = storedProductImagePath(
    {
      filePath: fileInfo.filePath,
      url: fileInfo.url,
      fileName: fileInfo.fileName || fileInfo.filename,
      name: fileInfo.name,
    },
    seriesSlug
  );
  if (!path) throw new Error('Upload did not return a file path');
  return path;
}

export default function SeriesFeaturedImageEditor({
  paths,
  seriesSlug,
  seriesId,
  onChange,
  onError,
}: SeriesFeaturedImageEditorProps) {
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceSlotRef = useRef<SeriesFeaturedSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [wizard, setWizard] = useState<WizardState | null>(null);

  const sourceUrl =
    toPublicImagePath(paths.featured_image_source) || toPublicImagePath(paths.featured_image);

  function reportError(err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    onError?.(message);
  }

  function closeWizard(state: WizardState | null = wizard) {
    if (state?.src.startsWith('blob:')) URL.revokeObjectURL(state.src);
    setWizard(null);
  }

  async function persist(file: File, field: keyof SeriesFeaturedPaths): Promise<string> {
    setBusy(true);
    try {
      const path = await uploadSeriesFile(file, seriesSlug);
      onChange({ [field]: path });
      if (seriesId) {
        const saved = await adminFetchJson(`/product-series/${seriesId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: path }),
        });
        if (!saved.ok) throw new Error(saved.error);
      }
      return path;
    } finally {
      setBusy(false);
    }
  }

  async function handleSourceFile(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) {
      onError?.(invalid);
      return;
    }
    try {
      await persist(file, 'featured_image_source');
      closeWizard();
      setWizard({
        step: 0,
        src: URL.createObjectURL(file),
        fileName: file.name,
        slotOnly: false,
      });
    } catch (err) {
      reportError(err);
    }
  }

  async function handleSlotCrop(file: File) {
    if (!wizard) return;
    const slot = SERIES_FEATURED_SLOTS[wizard.step];
    try {
      await persist(file, slot.field);
      if (!wizard.slotOnly && wizard.step < SERIES_FEATURED_SLOTS.length - 1) {
        setWizard({ ...wizard, step: wizard.step + 1 });
        return;
      }
      closeWizard();
    } catch (err) {
      reportError(err);
    }
  }

  function openAdjust(slot: SeriesFeaturedSlot) {
    const index = SERIES_FEATURED_SLOTS.findIndex((item) => item.slot === slot);
    if (index < 0 || !sourceUrl) return;
    closeWizard();
    setWizard({
      step: index,
      src: sourceUrl,
      fileName: 'series-source.jpg',
      slotOnly: true,
    });
  }

  function openReplace(slot: SeriesFeaturedSlot) {
    replaceSlotRef.current = slot;
    replaceInputRef.current?.click();
  }

  function handleReplaceFile(file: File) {
    const slot = replaceSlotRef.current;
    replaceSlotRef.current = null;
    if (!slot) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      onError?.(invalid);
      return;
    }
    const index = SERIES_FEATURED_SLOTS.findIndex((item) => item.slot === slot);
    closeWizard();
    setWizard({
      step: index,
      src: URL.createObjectURL(file),
      fileName: file.name,
      slotOnly: true,
    });
  }

  const currentSlot = wizard ? SERIES_FEATURED_SLOTS[wizard.step] : null;

  return (
    <div>
      <p className="block text-gray-700 mb-2">Featured image</p>
      <input
        ref={sourceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleSourceFile(file);
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) handleReplaceFile(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <HelpButton
          helpKey="admin.product_series.featured_image"
          type="button"
          className="btn-secondary text-center py-2 px-3 text-sm font-medium"
          disabled={busy}
          onClick={() => sourceInputRef.current?.click()}
        >
          {sourceUrl ? 'Replace source' : 'Upload source'}
        </HelpButton>
        <p className="text-xs text-gray-500">
          Crop one source into three frames, or upload a different photo for any slot.
        </p>
      </div>

      {sourceUrl ? (
        <AdminHoverPreview src={sourceUrl} className="mb-4 w-40">
          <div className="relative w-40 h-28 border rounded overflow-hidden bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourceUrl} alt="Source photo" className="absolute inset-0 h-full w-full object-contain" />
          </div>
        </AdminHoverPreview>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SERIES_FEATURED_SLOTS.map((slot) => {
          const src = toPublicImagePath(paths[slot.field]);
          return (
            <div key={slot.slot} className="border rounded p-3">
              <p className="text-sm font-medium text-gray-800">{slot.title}</p>
              <p className="text-xs text-gray-500 mb-2">{slot.hint}</p>
              <AdminHoverPreview src={src || null} className="block mb-2">
                <div className={`relative w-full overflow-hidden bg-gray-100 ${slot.frame.className}`}>
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={slot.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <HelpButton
                      helpKey="admin.product_series.featured_replace"
                      type="button"
                      className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50 p-0 border-0 bg-transparent font-normal"
                      disabled={busy}
                      onClick={() => openReplace(slot.slot)}
                    >
                      Upload a photo
                    </HelpButton>
                  )}
                </div>
              </AdminHoverPreview>
              <div className="flex flex-wrap gap-2">
                <Button
                  helpKey="admin.product_series.featured_replace"
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  disabled={busy}
                  onClick={() => openReplace(slot.slot)}
                >
                  {src ? 'Replace photo' : 'Upload photo'}
                </Button>
                <Button
                  helpKey={slot.helpKey}
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  disabled={busy || !sourceUrl}
                  onClick={() => openAdjust(slot.slot)}
                >
                  Adjust crop
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {wizard && currentSlot ? (
        <ImageCutboard
          key={`${wizard.step}:${wizard.src}`}
          imageSrc={wizard.src}
          frame={currentSlot.frame}
          sourceName={wizard.fileName}
          title={`${currentSlot.title} (${wizard.step + 1}/${SERIES_FEATURED_SLOTS.length})`}
          hint={`${currentSlot.hint} Starts with the whole photo. Zoom and drag to fill the ${currentSlot.frame.label} frame.`}
          confirmLabel={
            wizard.slotOnly || wizard.step === SERIES_FEATURED_SLOTS.length - 1 ? 'Apply crop' : 'Next'
          }
          extraActions={
            <Button
              helpKey="admin.product_series.featured_different"
              variant="secondary"
              disabled={busy}
              onClick={() => openReplace(currentSlot.slot)}
            >
              Use a different image
            </Button>
          }
          onCancel={() => closeWizard()}
          onConfirm={(file) => void handleSlotCrop(file)}
        />
      ) : null}
    </div>
  );
}

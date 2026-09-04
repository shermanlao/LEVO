'use client';

import { useState } from 'react';
import AdminPhotoSlot from '@/components/admin/AdminPhotoSlot';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import SizeDrawingAiDialog from '@/components/ai/SizeDrawingAiDialog';
import SizeDrawingFocusDialog from '@/components/ai/SizeDrawingFocusDialog';
import { adminFetchJson, uploadAdminImage } from '@/lib/admin-fetch';
import { storedProductImagePath, toPublicImagePath } from '@/lib/image-utils';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { IMAGE_FRAMES, validateImageFile } from '@/lib/image-frames';
import {
  formatSizeDrawingMissingMessage,
  getSizeDrawingMissingFields,
} from '@/lib/sizeDrawingMounting';

const FIELDS = [
  { key: 'main_image_A', label: 'Main A', helpKey: 'admin.product_series.size_photo_a' },
  { key: 'main_image_B', label: 'Main B', helpKey: 'admin.product_series.size_photo_b' },
  { key: 'size_image', label: 'Size drawing', helpKey: 'admin.product_series.size_drawing' },
] as const;

type SizePackPhotosProps = {
  productId?: number;
  seriesSlug: string;
  images: { main_image_A?: string; main_image_B?: string; size_image?: string };
  size?: string;
  cuthole?: string;
  mounting?: string;
  onChanged: () => void;
  onMainAUploaded?: (info: { productId: number; imagePath: string }) => void;
};

export default function SizePackPhotos({
  productId,
  seriesSlug,
  images,
  size = '',
  cuthole = '',
  mounting = '',
  onChanged,
  onMainAUploaded,
}: SizePackPhotosProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requestCrop, cutboard } = useImageCutboard();
  const [focusOpen, setFocusOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [croppedDataUrl, setCroppedDataUrl] = useState('');

  const mainPhotoUrl = toPublicImagePath(images.main_image_A);
  const drawingSize = String(size || '').trim();
  const drawingCuthole = String(cuthole || '').trim();

  if (!productId) {
    return (
      <p className="text-xs text-gray-500 md:col-span-12">
        Save variants to create this size pack, then upload photos.
      </p>
    );
  }

  async function upload(field: (typeof FIELDS)[number]['key'], file: File) {
    setBusy(field);
    setError(null);
    try {
      const uploaded = await uploadAdminImage(file, {
        productId: String(productId),
        imageType: field,
        seriesSlug,
      });
      if (!uploaded.ok) throw new Error(uploaded.error);
      const fileInfo =
        (uploaded.data as { files?: Array<{ url?: string; filename?: string }> }).files?.[0] || uploaded.data;
      const path = storedProductImagePath(
        {
          url: (fileInfo as { url?: string }).url,
          fileName: (fileInfo as { filename?: string }).filename,
        },
        seriesSlug
      );
      const saved = await adminFetchJson(`/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: path }),
      });
      if (!saved.ok) throw new Error(saved.error);
      onChanged();
      if (field === 'main_image_A' && productId) {
        onMainAUploaded?.({ productId, imagePath: path });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setBusy(null);
    }
  }

  async function remove(field: (typeof FIELDS)[number]['key']) {
    setBusy(field);
    setError(null);
    const saved = await adminFetchJson(`/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: '' }),
    });
    setBusy(null);
    if (!saved.ok) {
      setError(saved.error);
      return;
    }
    onChanged();
  }

  function startSizeAi() {
    const missing = getSizeDrawingMissingFields({
      mainPhoto: mainPhotoUrl,
      size: drawingSize,
      mounting,
      cuthole: drawingCuthole,
    });
    if (missing.length) {
      setError(formatSizeDrawingMissingMessage(missing));
      return;
    }
    setError(null);
    setFocusOpen(true);
  }

  return (
    <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {FIELDS.map((field) => {
        const src = toPublicImagePath(images[field.key]);
        return (
          <div key={field.key} className="border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">{field.label}</span>
              <HelpButton helpKey={field.helpKey} type="button" className="text-xs text-gray-400">
                ?
              </HelpButton>
            </div>
            <AdminPhotoSlot src={src} alt={field.label} className="mb-2" />
            <div className="flex flex-wrap items-center gap-2">
              <label className="btn-secondary text-xs py-1 px-2 cursor-pointer">
                {busy === field.key ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  data-help-key={field.helpKey}
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
                    void requestCrop(file, IMAGE_FRAMES.product).then((cropped) => {
                      if (cropped) void upload(field.key, cropped).catch(() => {});
                    });
                  }}
                />
              </label>
              {field.key === 'size_image' ? (
                <Button
                  helpKey="admin.product_series.size_drawing_ai"
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  disabled={busy != null}
                  onClick={startSizeAi}
                >
                  Generate by AI
                </Button>
              ) : null}
              {src ? (
                <Button
                  helpKey={field.helpKey}
                  variant="ghost"
                  className="text-xs text-red-600"
                  disabled={busy != null}
                  onClick={() => remove(field.key)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
      {error ? <p className="sm:col-span-3 text-xs text-red-600 whitespace-pre-line">{error}</p> : null}
      {cutboard}
      <SizeDrawingFocusDialog
        imageUrl={mainPhotoUrl}
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        onContinue={(dataUrl) => {
          setFocusOpen(false);
          setCroppedDataUrl(dataUrl);
          setAiOpen(true);
        }}
      />
      <SizeDrawingAiDialog
        open={aiOpen}
        croppedDataUrl={croppedDataUrl}
        size={drawingSize}
        cuthole={drawingCuthole || undefined}
        onClose={() => {
          setAiOpen(false);
          setCroppedDataUrl('');
        }}
        onApply={async (file) => {
          await upload('size_image', file);
        }}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import AdminPhotoSlot from '@/components/admin/AdminPhotoSlot';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import ImageFileIntake from '@/components/ui/ImageFileIntake';
import ProductPhotoStyleDialog from '@/components/ai/ProductPhotoStyleDialog';
import SizeDrawingAiDialog from '@/components/ai/SizeDrawingAiDialog';
import SizeDrawingFocusDialog from '@/components/ai/SizeDrawingFocusDialog';
import { uploadAdminImage } from '@/lib/admin-fetch';
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

type SizePackImages = { main_image_A?: string; main_image_B?: string; size_image?: string };

type SizePackPhotosProps = {
  productId?: number;
  seriesSlug: string;
  images: SizePackImages;
  size?: string;
  cuthole?: string;
  fixtureDescription?: string;
  mounting?: string;
  onChanged: (images: SizePackImages) => void;
  onMainAUploaded?: (info: { productId?: number; imagePath: string }) => void;
};

export default function SizePackPhotos({
  productId,
  seriesSlug,
  images,
  size = '',
  cuthole = '',
  fixtureDescription = '',
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
  const [hasPhotoStyle, setHasPhotoStyle] = useState<boolean | null>(null);
  const [styleField, setStyleField] = useState<'main_image_A' | 'main_image_B' | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/ai/settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setHasPhotoStyle(Boolean(data.data?.product_photo_style_image));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const mainPhotoUrl = toPublicImagePath(images.main_image_A);
  const stylePhotoUrl = styleField ? toPublicImagePath(images[styleField]) : null;
  const drawingSize = String(size || '').trim();
  const drawingCuthole = String(cuthole || '').trim();

  async function stageFile(field: (typeof FIELDS)[number]['key'], file: File) {
    setBusy(field);
    setError(null);
    try {
      const uploaded = await uploadAdminImage(file, {
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
      onChanged({ [field]: path });
      if (field === 'main_image_A') {
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

  function remove(field: (typeof FIELDS)[number]['key']) {
    setError(null);
    onChanged({ [field]: '' });
  }

  function takePhotoFile(field: (typeof FIELDS)[number]['key'], file: File) {
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    void requestCrop(file, IMAGE_FRAMES.product).then((cropped) => {
      if (cropped) void stageFile(field, cropped).catch(() => {});
    });
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
            <ImageFileIntake
              enabled={busy == null}
              clickToPick={!src}
              helpKey={field.helpKey}
              className="mb-2"
              onFile={(file) => takePhotoFile(field.key, file)}
            >
              <AdminPhotoSlot src={src} alt={field.label} />
            </ImageFileIntake>
            <div className="flex flex-wrap items-center gap-2">
              {busy === field.key ? <span className="text-xs text-gray-500">Uploading…</span> : null}
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
              {src && (field.key === 'main_image_A' || field.key === 'main_image_B') ? (
                <Button
                  helpKey="admin.product_series.photo_style_match"
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  disabled={busy != null}
                  onClick={() => {
                    if (hasPhotoStyle === false) {
                      setError('Upload a catalog photo style on /admin/ai first.');
                      return;
                    }
                    setError(null);
                    setStyleField(field.key);
                  }}
                >
                  Match catalog style
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
          await stageFile('size_image', file);
        }}
      />
      <ProductPhotoStyleDialog
        open={Boolean(styleField && stylePhotoUrl)}
        imageUrl={stylePhotoUrl || ''}
        photoType={styleField || 'main_image_A'}
        fixtureDescription={fixtureDescription}
        onClose={() => setStyleField(null)}
        onApply={async (file) => {
          if (!styleField) return;
          await stageFile(styleField, file);
        }}
      />
    </div>
  );
}

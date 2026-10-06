'use client';

import { useState } from 'react';
import AdminPhotoSlot from '@/components/admin/AdminPhotoSlot';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import ImageFileIntake from '@/components/ui/ImageFileIntake';
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
import { sizeDrawingProductPhotoPath, type AppearancePhotoDto } from '@shared/appearance-photos';

type SizePackImages = { size_image?: string };

type SizePackPhotosProps = {
  seriesSlug: string;
  images: SizePackImages;
  size?: string;
  cuthole?: string;
  description?: string;
  fixtureDescription?: string;
  mounting?: string;
  appearancePhotos?: AppearancePhotoDto[];
  seriesImageUrl?: string;
  onChanged: (images: SizePackImages) => void;
};

export default function SizePackPhotos({
  seriesSlug,
  images,
  size = '',
  cuthole = '',
  description = '',
  fixtureDescription = '',
  mounting = '',
  appearancePhotos = [],
  seriesImageUrl = '',
  onChanged,
}: SizePackPhotosProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { requestCrop, cutboard } = useImageCutboard();
  const [focusOpen, setFocusOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [croppedDataUrl, setCroppedDataUrl] = useState('');

  const drawingSize = String(size || '').trim();
  const drawingCuthole = String(cuthole || '').trim();
  const productPhotoUrl = toPublicImagePath(
    sizeDrawingProductPhotoPath(appearancePhotos, drawingSize, [seriesImageUrl])
  );
  const src = toPublicImagePath(images.size_image);

  async function stageFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadAdminImage(file, {
        imageType: 'size_image',
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
      onChanged({ size_image: path });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  function takePhotoFile(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    void requestCrop(file, IMAGE_FRAMES.product).then((cropped) => {
      if (cropped) void stageFile(cropped).catch(() => {});
    });
  }

  function startSizeAi() {
    const missing = getSizeDrawingMissingFields({
      mainPhoto: productPhotoUrl,
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
    <div className="md:col-span-12">
      <div className="border border-gray-200 rounded p-3 max-w-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Size drawing</span>
          <HelpButton helpKey="admin.product_series.size_drawing" type="button" className="text-xs text-gray-400">
            ?
          </HelpButton>
        </div>
        <ImageFileIntake
          enabled={!busy}
          clickToPick={!src}
          helpKey="admin.product_series.size_drawing"
          className="mb-2"
          onFile={takePhotoFile}
        >
          <AdminPhotoSlot src={src} alt="Size drawing" />
        </ImageFileIntake>
        <div className="flex flex-wrap items-center gap-2">
          {busy ? <span className="text-xs text-gray-500">Uploading…</span> : null}
          <Button
            helpKey="admin.product_series.size_drawing_ai"
            variant="secondary"
            className="text-xs py-1 px-2"
            disabled={busy}
            onClick={startSizeAi}
          >
            Generate by AI
          </Button>
          {src ? (
            <Button
              helpKey="admin.product_series.size_drawing"
              variant="ghost"
              className="text-xs text-red-600"
              disabled={busy}
              onClick={() => {
                setError(null);
                onChanged({ size_image: '' });
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-xs text-red-600 mt-2 whitespace-pre-line">{error}</p> : null}
      {cutboard}
      <SizeDrawingFocusDialog
        imageUrl={productPhotoUrl}
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
        description={description}
        fixtureDescription={fixtureDescription}
        onClose={() => {
          setAiOpen(false);
          setCroppedDataUrl('');
        }}
        onApply={async (file) => {
          await stageFile(file);
        }}
      />
    </div>
  );
}

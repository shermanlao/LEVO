'use client';

import { useEffect, useRef, useState } from 'react';
import AdminPhotoSlot from '@/components/admin/AdminPhotoSlot';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import ImageCutboard from '@/components/ui/ImageCutboard';
import ImageFileIntake from '@/components/ui/ImageFileIntake';
import { adminFetchJson, uploadAdminImage } from '@/lib/admin-fetch';
import { extractImageSrc, storedProductImagePath, toPublicImagePath } from '@/lib/image-utils';
import { IMAGE_FRAMES, validateImageFile, type ImageFrame } from '@/lib/image-frames';
import { loadImageElement } from '@/lib/image-cutboard';
import { outpaintToFrame } from '@/lib/photo-outpaint';
import { dataUrlToFile } from '@/lib/sizeDrawingCropClient';

export type SeriesFeaturedPaths = {
  featured_image_source: string;
  featured_image: string;
  featured_image_page: string;
  featured_image_datasheet: string;
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
    files?: Array<{ url?: string; filename?: string; filePath?: string; fileName?: string; name?: string }>;
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

function ownAspectFrame(ratio: number): ImageFrame {
  return {
    key: 'seriesPage',
    ratio: ratio > 0 ? ratio : 1,
    className: '',
    label: 'series photo',
    mime: 'image/jpeg',
    maxEdge: 1600,
  };
}

export default function SeriesFeaturedImageEditor({
  paths,
  seriesSlug,
  seriesId,
  onChange,
  onError,
}: SeriesFeaturedImageEditorProps) {
  const seriesInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendNote, setExtendNote] = useState<string | null>(null);
  const [seriesRatio, setSeriesRatio] = useState<number | null>(null);
  const [crop, setCrop] = useState<{ src: string; frame: ImageFrame; fileName: string } | null>(null);

  const seriesPath = toPublicImagePath(paths.featured_image_page);
  const cardPath = toPublicImagePath(paths.featured_image);

  useEffect(() => {
    if (!seriesPath) {
      setSeriesRatio(null);
      return;
    }
    let cancelled = false;
    loadImageElement(seriesPath)
      .then((img) => {
        if (cancelled) return;
        const ratio = img.naturalWidth / img.naturalHeight;
        setSeriesRatio(ratio > 0 ? ratio : null);
      })
      .catch(() => {
        if (!cancelled) setSeriesRatio(null);
      });
    return () => {
      cancelled = true;
    };
  }, [seriesPath]);

  function reportError(err: unknown) {
    onError?.(err instanceof Error ? err.message : 'Upload failed');
  }

  function closeCrop() {
    if (crop?.src.startsWith('blob:')) URL.revokeObjectURL(crop.src);
    setCrop(null);
  }

  async function persist(file: File, field: 'featured_image' | 'featured_image_page'): Promise<void> {
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
    } finally {
      setBusy(false);
    }
  }

  async function clearField(field: 'featured_image' | 'featured_image_page') {
    setBusy(true);
    try {
      onChange({ [field]: '' });
      if (seriesId) {
        const saved = await adminFetchJson(`/product-series/${seriesId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: null }),
        });
        if (!saved.ok) throw new Error(saved.error);
      }
    } catch (err) {
      reportError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleSeriesFile(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) {
      onError?.(invalid);
      return;
    }
    try {
      await persist(file, 'featured_image_page');
    } catch (err) {
      reportError(err);
    }
  }

  async function openAdjust() {
    if (!seriesPath) return;
    try {
      const img = await loadImageElement(seriesPath);
      const ratio = img.naturalWidth / img.naturalHeight;
      closeCrop();
      setCrop({
        src: seriesPath,
        frame: ownAspectFrame(ratio),
        fileName: 'series-photo.jpg',
      });
    } catch (err) {
      reportError(err);
    }
  }

  async function extendCard() {
    if (!seriesPath) return;
    setExtending(true);
    setExtendNote(null);
    try {
      const extended = await outpaintToFrame(seriesPath, IMAGE_FRAMES.catalog);
      if (!extended.extended) {
        setExtendNote('This series photo is already 16:9, so the card does not need a new background.');
        return;
      }
      await persist(dataUrlToFile(extended.dataUrl, 'card-16x9.jpg'), 'featured_image');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extend failed';
      setExtendNote(message);
      reportError(err);
    } finally {
      setExtending(false);
    }
  }

  return (
    <div>
      <p className="block text-gray-700 mb-2">Featured image</p>
      <input
        ref={seriesInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleSeriesFile(file);
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <p className="text-sm font-medium text-gray-800">Series photo</p>
          <p className="text-xs text-gray-500 mb-2">
            Shown on the series page and on datasheets. Keeps this file’s own shape.
          </p>
          <ImageFileIntake
            enabled={!busy}
            clickToPick={!seriesPath}
            helpKey="admin.product_series.series_photo"
            className="mb-2"
            onFile={(file) => void handleSeriesFile(file)}
          >
            <AdminPhotoSlot
              src={seriesPath || null}
              alt="Series photo"
              aspectRatio={seriesRatio ?? undefined}
              frameClassName="min-h-48"
              className="border border-gray-200"
            />
          </ImageFileIntake>
          <div className="flex flex-wrap gap-2">
            <HelpButton
              helpKey="admin.product_series.series_photo"
              type="button"
              className="btn-secondary text-center py-1 px-2 text-xs font-medium"
              disabled={busy}
              onClick={() => seriesInputRef.current?.click()}
            >
              {seriesPath ? 'Replace photo' : 'Upload photo'}
            </HelpButton>
            {seriesPath ? (
              <Button
                helpKey="admin.product_series.series_photo_adjust"
                variant="secondary"
                className="text-xs py-1 px-2"
                disabled={busy}
                onClick={() => void openAdjust()}
              >
                Adjust crop
              </Button>
            ) : null}
            {seriesPath ? (
              <Button
                helpKey="admin.product_series.featured_delete"
                variant="danger"
                className="text-xs py-1 px-2"
                disabled={busy}
                onClick={() => void clearField('featured_image_page')}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        <div className="border rounded p-3">
          <p className="text-sm font-medium text-gray-800">Card photo</p>
          <p className="text-xs text-gray-500 mb-2">
            16:9 image on the homepage and on category cards such as Downlights.
          </p>
          <AdminPhotoSlot
            src={cardPath || null}
            alt="Card photo"
            frameClassName={IMAGE_FRAMES.catalog.className}
            emptyLabel="16:9 card. Extend the series photo to fill this frame."
            className="border border-gray-200 mb-2"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              helpKey="admin.product_series.card_extend"
              variant="secondary"
              className="text-xs py-1 px-2"
              disabled={busy || extending || !seriesPath}
              onClick={() => void extendCard()}
            >
              {extending ? 'Extending…' : 'Extend to 16:9'}
            </Button>
            {cardPath ? (
              <Button
                helpKey="admin.product_series.featured_delete"
                variant="danger"
                className="text-xs py-1 px-2"
                disabled={busy}
                onClick={() => void clearField('featured_image')}
              >
                Delete
              </Button>
            ) : null}
          </div>
          {extendNote ? <p className="mt-2 text-xs text-gray-600">{extendNote}</p> : null}
        </div>
      </div>

      {crop ? (
        <ImageCutboard
          key={crop.src}
          imageSrc={crop.src}
          frame={crop.frame}
          sourceName={crop.fileName}
          title="Adjust series photo"
          hint="Zoom and drag inside the photo’s own shape. The fixture is not stretched into another ratio."
          confirmLabel="Apply crop"
          onCancel={closeCrop}
          onConfirm={(file) => {
            closeCrop();
            void persist(file, 'featured_image_page').catch(reportError);
          }}
        />
      ) : null}
    </div>
  );
}

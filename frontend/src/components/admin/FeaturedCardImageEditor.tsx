'use client';

import { useEffect, useRef, useState } from 'react';
import AdminPhotoSlot from '@/components/admin/AdminPhotoSlot';
import HelpButton from '@/components/admin/HelpButton';
import ProductPhotoAiEditDialog from '@/components/ai/ProductPhotoAiEditDialog';
import Button from '@/components/ui/Button';
import EdgeCropBoard from '@/components/ui/EdgeCropBoard';
import ImageFileIntake from '@/components/ui/ImageFileIntake';
import { uploadAdminImage } from '@/lib/admin-fetch';
import { storedProductImagePath, toPublicImagePath } from '@/lib/image-utils';
import { IMAGE_FRAMES, validateImageFile } from '@/lib/image-frames';
import { loadImageElement } from '@/lib/image-cutboard';
import { outpaintToFrame } from '@/lib/photo-outpaint';
import { dataUrlToFile } from '@/lib/sizeDrawingCropClient';

export type FeaturedCardSlot = 'source' | 'card';

export type FeaturedCardCopy = {
  sourceTitle: string;
  sourceHint: string;
  cardTitle: string;
  cardHint: string;
  cardEmpty: string;
  alreadyWide: string;
  alreadyRatio: string;
  adjustTitle: string;
};

export type FeaturedCardHelp = {
  source: string;
  adjust: string;
  extend: string;
  deleteSlot: string;
  ai: string;
};

type FeaturedCardImageEditorProps = {
  sourceSrc?: string | null;
  cardSrc?: string | null;
  copy: FeaturedCardCopy;
  help: FeaturedCardHelp;
  persist: (file: File, slot: FeaturedCardSlot) => Promise<void>;
  clear: (slot: FeaturedCardSlot) => Promise<void>;
  onError?: (message: string) => void;
};

export async function uploadFeaturedCardFile(file: File, folderSlug?: string): Promise<string> {
  const uploaded = await uploadAdminImage(file, {
    imageType: 'featured',
    ...(folderSlug ? { seriesSlug: folderSlug } : {}),
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
    folderSlug
  );
  if (!path) throw new Error('Upload did not return a file path');
  return path;
}

export default function FeaturedCardImageEditor({
  sourceSrc,
  cardSrc,
  copy,
  help,
  persist,
  clear,
  onError,
}: FeaturedCardImageEditorProps) {
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const cardFrameRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendNote, setExtendNote] = useState<string | null>(null);
  const [sourceRatio, setSourceRatio] = useState<number | null>(null);
  const [frameHeight, setFrameHeight] = useState<number | null>(null);
  const [crop, setCrop] = useState<{ src: string; fileName: string } | null>(null);
  const [aiEdit, setAiEdit] = useState<{
    slot: FeaturedCardSlot;
    src: string;
    photoType: string;
  } | null>(null);

  const sourcePath = toPublicImagePath(sourceSrc);
  const cardPath = toPublicImagePath(cardSrc);

  useEffect(() => {
    if (!sourcePath) {
      setSourceRatio(null);
      return;
    }
    let cancelled = false;
    loadImageElement(sourcePath)
      .then((img) => {
        if (cancelled) return;
        const ratio = img.naturalWidth / img.naturalHeight;
        setSourceRatio(ratio > 0 ? ratio : null);
      })
      .catch(() => {
        if (!cancelled) setSourceRatio(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sourcePath]);

  useEffect(() => {
    const el = cardFrameRef.current;
    if (!el) return;
    const measure = () => {
      const next = Math.round(el.getBoundingClientRect().height);
      setFrameHeight(next > 0 ? next : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cardPath]);

  function reportError(err: unknown) {
    onError?.(err instanceof Error ? err.message : 'Upload failed');
  }

  function closeCrop() {
    if (crop?.src.startsWith('blob:')) URL.revokeObjectURL(crop.src);
    setCrop(null);
  }

  async function save(file: File, slot: FeaturedCardSlot): Promise<void> {
    setBusy(true);
    try {
      await persist(file, slot);
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
      await save(file, 'source');
    } catch (err) {
      reportError(err);
    }
  }

  async function extendCard() {
    if (!sourcePath) return;
    setExtending(true);
    setExtendNote(null);
    try {
      const extended = await outpaintToFrame(sourcePath, IMAGE_FRAMES.catalog, { horizontalOnly: true });
      if (!extended.extended) {
        setExtendNote(
          sourceRatio && sourceRatio > IMAGE_FRAMES.catalog.ratio ? copy.alreadyWide : copy.alreadyRatio
        );
        return;
      }
      await save(dataUrlToFile(extended.dataUrl, 'card-16x9.jpg'), 'card');
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <p className="text-sm font-medium text-gray-800">{copy.sourceTitle}</p>
          <p className="text-xs text-gray-500 mb-2">{copy.sourceHint}</p>
          <ImageFileIntake
            enabled={!busy}
            clickToPick={!sourcePath}
            helpKey={help.source}
            className="mb-2 w-fit max-w-full"
            onFile={(file) => void handleSourceFile(file)}
          >
            <div
              style={
                frameHeight
                  ? {
                      height: frameHeight,
                      width: Math.max(1, Math.round(frameHeight * (sourceRatio || 1))),
                    }
                  : undefined
              }
            >
              <AdminPhotoSlot
                src={sourcePath || null}
                alt={copy.sourceTitle}
                frameClassName={frameHeight ? 'h-full' : 'min-h-48'}
                className="h-full border border-gray-200"
                helpKey={help.ai}
                onImageClick={
                  sourcePath
                    ? () => {
                        if (busy) return;
                        setAiEdit({ slot: 'source', src: sourcePath, photoType: 'source_photo' });
                      }
                    : undefined
                }
              />
            </div>
          </ImageFileIntake>
          <div className="flex flex-wrap gap-2">
            <HelpButton
              helpKey={help.source}
              type="button"
              className="btn-secondary text-center py-1 px-2 text-xs font-medium"
              disabled={busy}
              onClick={() => sourceInputRef.current?.click()}
            >
              {sourcePath ? 'Replace photo' : 'Upload photo'}
            </HelpButton>
            {sourcePath ? (
              <Button
                helpKey={help.adjust}
                variant="secondary"
                className="text-xs py-1 px-2"
                disabled={busy}
                onClick={() => {
                  closeCrop();
                  setCrop({ src: sourcePath, fileName: 'source-photo.jpg' });
                }}
              >
                Adjust crop
              </Button>
            ) : null}
            {sourcePath ? (
              <Button
                helpKey={help.deleteSlot}
                variant="danger"
                className="text-xs py-1 px-2"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void clear('source').finally(() => setBusy(false));
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        <div className="border rounded p-3">
          <p className="text-sm font-medium text-gray-800">{copy.cardTitle}</p>
          <p className="text-xs text-gray-500 mb-2">{copy.cardHint}</p>
          <div ref={cardFrameRef} className="mb-2">
            <AdminPhotoSlot
              src={cardPath || null}
              alt={copy.cardTitle}
              frameClassName={IMAGE_FRAMES.catalog.className}
              emptyLabel={copy.cardEmpty}
              className="border border-gray-200"
              helpKey={help.ai}
              onImageClick={
                cardPath
                  ? () => {
                      if (busy) return;
                      setAiEdit({ slot: 'card', src: cardPath, photoType: 'card_photo' });
                    }
                  : undefined
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              helpKey={help.extend}
              variant="secondary"
              className="text-xs py-1 px-2"
              disabled={busy || extending || !sourcePath}
              onClick={() => void extendCard()}
            >
              {extending ? 'Extending…' : 'Extend to 16:9'}
            </Button>
            {cardPath ? (
              <Button
                helpKey={help.deleteSlot}
                variant="danger"
                className="text-xs py-1 px-2"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void clear('card').finally(() => setBusy(false));
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
          {extendNote ? <p className="mt-2 text-xs text-gray-600">{extendNote}</p> : null}
        </div>
      </div>

      {aiEdit ? (
        <ProductPhotoAiEditDialog
          open
          imageUrl={aiEdit.src}
          photoType={aiEdit.photoType}
          onClose={() => setAiEdit(null)}
          onApply={async (file) => {
            await save(file, aiEdit.slot);
          }}
        />
      ) : null}

      {crop ? (
        <EdgeCropBoard
          key={crop.src}
          imageSrc={crop.src}
          sourceName={crop.fileName}
          title={copy.adjustTitle}
          hint="Drag each white edge on its own to cut that side. The other three edges stay put."
          confirmLabel="Apply crop"
          onCancel={closeCrop}
          onConfirm={(file) => {
            closeCrop();
            void save(file, 'source').catch(reportError);
          }}
        />
      ) : null}
    </div>
  );
}

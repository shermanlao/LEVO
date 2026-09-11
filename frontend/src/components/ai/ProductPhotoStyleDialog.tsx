'use client';

import { FormEvent, useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import AiImageWorkbenchDialog from './AiImageWorkbenchDialog';
import { IMAGE_FRAMES } from '@/lib/image-frames';
import { dataUrlToFile, imageUrlToJpegDataUrl } from '@/lib/sizeDrawingCropClient';

type Props = {
  open: boolean;
  imageUrl: string;
  photoType: string;
  fixtureDescription?: string;
  onClose: () => void;
  onApply: (file: File) => Promise<void>;
};

export default function ProductPhotoStyleDialog({
  open,
  imageUrl,
  photoType,
  fixtureDescription = '',
  onClose,
  onApply,
}: Props) {
  const [original, setOriginal] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOriginal(imageUrl);
    setPreview(imageUrl);
    setInstruction('');
    setError(null);
    setLoading(true);

    void (async () => {
      try {
        const imageDataUrl = await imageUrlToJpegDataUrl(imageUrl);
        if (cancelled) return;
        const res = await fetch('/api/admin/ai/stylize-product-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl,
            imageUrl: imageUrl.startsWith('data:') ? undefined : imageUrl,
            fixtureDescription: fixtureDescription.trim() || undefined,
            placeholderSize: {
              aspect: IMAGE_FRAMES.product.label,
              width: IMAGE_FRAMES.product.maxEdge,
              height: IMAGE_FRAMES.product.maxEdge,
              label: 'square catalog photo slot (Main A / Main B)',
            },
          }),
        });
        const data = await res.json().catch(() => ({} as { error?: string; imageDataUrl?: string }));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Style match failed');
        if (!data.imageDataUrl) throw new Error('Style match returned no image');
        setPreview(data.imageDataUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Style match failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, imageUrl, fixtureDescription]);

  if (!open) return null;

  async function refine(text: string) {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/edit-product-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: preview,
          instruction: text,
          photoType,
        }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; imageDataUrl?: string }));
      if (!res.ok) throw new Error(data.error || 'Refine failed');
      if (!data.imageDataUrl) throw new Error('Refine returned no image');
      setPreview(data.imageDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refine failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefine(e: FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return;
    await refine(instruction.trim());
    setInstruction('');
  }

  const changed = Boolean(original && preview && original !== preview);
  const canRefine = Boolean(preview && !loading);

  return (
    <AiImageWorkbenchDialog
      title="Match catalog style"
      slotLabel={photoType.replace(/_/g, ' ')}
      previewUrl={preview}
      loading={loading}
      error={error}
      onClose={onClose}
      onReset={() => {
        setPreview(original);
        setInstruction('');
        setError(null);
      }}
    >
      <form onSubmit={handleRefine} className="space-y-3">
        <p className="text-sm text-gray-600">
          The model first describes this photo, then cutout / polish / places it in the catalog style
          scene. After the preview appears, chat to refine it. Apply replaces this slot. Close or Reset
          keeps the original upload.
        </p>
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={!canRefine}
          placeholder="Refine the styled photo (e.g. warmer light, tighter crop, less ceiling texture)"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            helpKey="admin.product_series.photo_style_refine"
            type="submit"
            variant="secondary"
            disabled={!canRefine || !instruction.trim()}
          >
            Refine
          </Button>
          <HelpButton
            helpKey="admin.product_series.photo_style_apply"
            type="button"
            disabled={!changed || loading || applying}
            className="btn-primary text-sm disabled:opacity-60"
            onClick={async () => {
              if (!preview) return;
              setApplying(true);
              try {
                await onApply(
                  dataUrlToFile(preview, `${photoType}${preview.startsWith('data:image/jpeg') ? '.jpg' : '.png'}`)
                );
                onClose();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to apply');
              } finally {
                setApplying(false);
              }
            }}
          >
            {applying ? 'Saving…' : 'Apply'}
          </HelpButton>
        </div>
      </form>
    </AiImageWorkbenchDialog>
  );
}

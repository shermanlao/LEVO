'use client';

import { FormEvent, useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import AiImageWorkbenchDialog from './AiImageWorkbenchDialog';
import { IMAGE_FRAMES, type ImageFrame } from '@/lib/image-frames';
import { outpaintToFrame } from '@/lib/photo-outpaint';
import { dataUrlToFile, imageUrlToJpegDataUrl } from '@/lib/sizeDrawingCropClient';

export type StyleApplyTarget = {
  id: string;
  label: string;
  frame: ImageFrame;
};

type Props = {
  open: boolean;
  imageUrl: string;
  photoType: string;
  fixtureDescription?: string;
  /** Location frames. Each button extends the styled photo to that ratio, then saves it there. */
  applyTargets?: StyleApplyTarget[];
  onClose: () => void;
  onApply: (file: File) => Promise<void>;
  onApplyTarget?: (targetId: string, file: File, styleFile: File) => Promise<void>;
};

export default function ProductPhotoStyleDialog({
  open,
  imageUrl,
  photoType,
  fixtureDescription = '',
  applyTargets = [],
  onClose,
  onApply,
  onApplyTarget,
}: Props) {
  const [original, setOriginal] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyingTarget, setApplyingTarget] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOriginal(imageUrl);
    setPreview(imageUrl);
    setInstruction('');
    setError(null);
    setStatus(null);
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
  const canRefine = Boolean(preview && !loading && !applyingTarget);

  async function applyToTarget(target: StyleApplyTarget) {
    if (!preview || !onApplyTarget) return;
    setApplyingTarget(target.id);
    setError(null);
    setStatus(null);
    try {
      const extended = await outpaintToFrame(preview, target.frame);
      const styleFile = dataUrlToFile(preview, 'style-photo.jpg');
      const slotFile = dataUrlToFile(extended.dataUrl, `${target.id}.jpg`);
      await onApplyTarget(target.id, slotFile, styleFile);
      setStatus(
        extended.extended
          ? `Saved to ${target.label}. The background was extended to ${target.frame.label} without stretching the fixture.`
          : `Saved to ${target.label}. The photo already matched ${target.frame.label}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply');
    } finally {
      setApplyingTarget(null);
    }
  }

  return (
    <AiImageWorkbenchDialog
      title={applyTargets.length ? 'Style with AI' : 'Match catalog style'}
      slotLabel={photoType.replace(/_/g, ' ')}
      previewUrl={preview}
      loading={loading}
      error={error}
      onClose={onClose}
      onReset={() => {
        setPreview(original);
        setInstruction('');
        setError(null);
        setStatus(null);
      }}
    >
      <form onSubmit={handleRefine} className="space-y-3">
        <p className="text-sm text-gray-600">
          {applyTargets.length
            ? 'The model first describes this photo, then cutout / polish / places it in the catalog style scene. Chat to refine the preview. Save style photo keeps it on the style placeholder. Apply to a location extends the background to that frame without stretching the fixture.'
            : 'The model first describes this photo, then cutout / polish / places it in the catalog style scene. After the preview appears, chat to refine it. Apply replaces this slot. Close or Reset keeps the original upload.'}
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
            disabled={!changed || loading || applying || Boolean(applyingTarget)}
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
            {applying ? 'Saving…' : applyTargets.length ? 'Save style photo' : 'Apply'}
          </HelpButton>
          {applyTargets.map((target) => (
            <Button
              key={target.id}
              helpKey="admin.product_series.photo_apply_location"
              variant="secondary"
              disabled={!canRefine || applying || Boolean(applyingTarget)}
              onClick={() => void applyToTarget(target)}
            >
              {applyingTarget === target.id ? 'Extending…' : `Apply to ${target.label}`}
            </Button>
          ))}
        </div>
        {status ? <p className="text-sm text-gray-600">{status}</p> : null}
      </form>
    </AiImageWorkbenchDialog>
  );
}

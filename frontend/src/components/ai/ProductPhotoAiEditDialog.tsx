'use client';

import { FormEvent, useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import AiImageWorkbenchDialog from './AiImageWorkbenchDialog';
import type { ImageFrame } from '@/lib/image-frames';
import { dataUrlToFile, imageUrlToDataUrl, padImageToAspect } from '@/lib/sizeDrawingCropClient';

type Props = {
  open: boolean;
  imageUrl: string;
  photoType: string;
  /** When set, the dialog can outpaint this photo to the placeholder frame. */
  extendFrame?: ImageFrame | null;
  onClose: () => void;
  onApply: (file: File) => Promise<void>;
};

export default function ProductPhotoAiEditDialog({
  open,
  imageUrl,
  photoType,
  extendFrame = null,
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
    imageUrlToDataUrl(imageUrl)
      .then((dataUrl) => {
        if (cancelled) return;
        setOriginal(dataUrl);
        setPreview(dataUrl);
        setInstruction('');
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load photo');
      });
    return () => {
      cancelled = true;
    };
  }, [open, imageUrl]);

  if (!open) return null;

  async function runEdit(
    text: string,
    imageDataUrl = preview,
    outpaint?: { aspect: string; axis: 'horizontal' | 'vertical' }
  ) {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/edit-product-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl,
          instruction: text,
          photoType,
          outpaint,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Edit failed');
      setPreview(data.imageDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!instruction.trim() || loading) return;
    const text = instruction.trim();
    setInstruction('');
    await runEdit(text);
  }

  async function handleExtendSides() {
    if (!preview || !extendFrame) return;
    setLoading(true);
    setError(null);
    try {
      const padded = await padImageToAspect(preview, extendFrame.ratio, extendFrame.maxEdge);
      if (padded.axis === 'none') {
        setError(`This photo already matches the ${extendFrame.label} placeholder.`);
        setLoading(false);
        return;
      }
      setPreview(padded.dataUrl);
      await runEdit('', padded.dataUrl, { aspect: extendFrame.label, axis: padded.axis });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extend failed');
      setLoading(false);
    }
  }

  const changed = Boolean(original && preview && original !== preview);

  return (
    <AiImageWorkbenchDialog
      title="Edit photo with AI"
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
      extraHeader={
        <>
          {extendFrame ? (
            <Button
              helpKey="admin.product_series.photo_extend_sides"
              variant="secondary"
              className="text-sm py-1 px-3"
              disabled={loading || !preview}
              onClick={() => void handleExtendSides()}
            >
              Extend sides
            </Button>
          ) : null}
          <Button
            helpKey="admin.product_series.photo_enhance_upscale"
            variant="secondary"
            className="text-sm py-1 px-3"
            disabled={loading || !preview}
            onClick={() =>
              void runEdit('Increase resolution / upscale while keeping the same product and composition.')
            }
          >
            Upscale
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => void handleSend(event)}
        onClick={(event) => event.stopPropagation()}
        className="space-y-3"
      >
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. white background, remove glare"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            helpKey="admin.product_series.photo_enhance_send"
            variant="primary"
            className="text-sm"
            disabled={loading || !instruction.trim()}
            type="button"
            onClick={() => void handleSend()}
          >
            Send
          </Button>
          <HelpButton
            helpKey="admin.product_series.photo_enhance_apply"
            type="button"
            disabled={!changed || loading || applying}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-60"
            onClick={async () => {
              if (!preview) return;
              setApplying(true);
              try {
                await onApply(dataUrlToFile(preview, `${photoType}.png`));
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

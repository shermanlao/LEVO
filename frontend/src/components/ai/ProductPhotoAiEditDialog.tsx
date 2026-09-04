'use client';

import { FormEvent, useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import AiImageWorkbenchDialog from './AiImageWorkbenchDialog';
import { dataUrlToFile, imageUrlToDataUrl } from '@/lib/sizeDrawingCropClient';

type Props = {
  open: boolean;
  imageUrl: string;
  photoType: string;
  onClose: () => void;
  onApply: (file: File) => Promise<void>;
};

export default function ProductPhotoAiEditDialog({
  open,
  imageUrl,
  photoType,
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

  async function runEdit(text: string) {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Edit failed');
      setPreview(data.imageDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return;
    await runEdit(instruction.trim());
    setInstruction('');
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
      }}
      extraHeader={
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm"
          disabled={loading || !preview}
          onClick={() => void runEdit('Increase resolution / upscale while keeping the same product and composition.')}
        >
          Upscale
        </button>
      }
    >
      <form onSubmit={handleSend} className="space-y-3">
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. white background, remove glare"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading || !instruction.trim()}
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm disabled:opacity-60"
          >
            Send
          </button>
          <HelpButton
            helpKey="admin.products.photo_ai"
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

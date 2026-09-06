'use client';

import { useEffect, useState } from 'react';
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

export default function ProductPhotoStyleDialog({
  open,
  imageUrl,
  photoType,
  onClose,
  onApply,
}: Props) {
  const [original, setOriginal] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  async function stylize(source: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/stylize-product-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Style match failed');
      setPreview(data.imageDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Style match failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOriginal(null);
    setPreview(null);
    setError(null);
    imageUrlToDataUrl(imageUrl)
      .then((dataUrl) => {
        if (cancelled) return;
        setOriginal(dataUrl);
        setPreview(dataUrl);
        void stylize(dataUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load photo');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageUrl]);

  if (!open) return null;

  const changed = Boolean(original && preview && original !== preview);

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
        setError(null);
      }}
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Optional preview. Apply replaces this slot. Close or Reset keeps the original upload.
        </p>
        <div className="flex flex-wrap gap-2">
          <HelpButton
            helpKey="admin.product_series.photo_style_apply"
            type="button"
            disabled={!changed || loading || applying}
            className="btn-primary text-sm disabled:opacity-60"
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
      </div>
    </AiImageWorkbenchDialog>
  );
}

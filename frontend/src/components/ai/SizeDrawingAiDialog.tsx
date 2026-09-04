'use client';

import { FormEvent, useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import AiImageWorkbenchDialog from './AiImageWorkbenchDialog';
import { dataUrlToFile } from '@/lib/sizeDrawingCropClient';

type Props = {
  open: boolean;
  croppedDataUrl: string;
  size: string;
  cuthole?: string | null;
  onClose: () => void;
  onApply: (file: File) => Promise<void>;
};

export default function SizeDrawingAiDialog({
  open,
  croppedDataUrl,
  size,
  cuthole,
  onClose,
  onApply,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  async function generate(refine?: string) {
    setLoading(true);
    setError(null);
    try {
      const endpoint = refine
        ? '/api/admin/ai/refine-size-drawing'
        : '/api/admin/ai/generate-size-drawing';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: refine ? preview || croppedDataUrl : croppedDataUrl,
          size,
          cuthole,
          instruction: refine,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setPreview(data.imageDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && croppedDataUrl) {
      setPreview(null);
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, croppedDataUrl]);

  if (!open) return null;

  async function handleRefine(e: FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return;
    await generate(instruction.trim());
    setInstruction('');
  }

  return (
    <AiImageWorkbenchDialog
      title="Size drawing AI"
      slotLabel="Size image"
      previewUrl={preview}
      loading={loading}
      error={error}
      onClose={onClose}
      onReset={() => {
        setPreview(null);
        void generate();
      }}
    >
      <form onSubmit={handleRefine} className="space-y-3">
        <p className="text-sm text-gray-600">
          Dimensions: {size}
          {cuthole ? ` · Cut hole: ${cuthole}` : ''}
        </p>
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Refine the drawing (e.g. add cut-hole callout)"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            helpKey="admin.product_series.size_drawing_ai_refine"
            type="submit"
            variant="secondary"
            disabled={loading || !instruction.trim()}
          >
            Refine
          </Button>
          <HelpButton
            helpKey="admin.product_series.size_drawing_ai_apply"
            type="button"
            disabled={!preview || loading || applying}
            className="btn-primary text-sm disabled:opacity-60"
            onClick={async () => {
              if (!preview) return;
              setApplying(true);
              try {
                await onApply(dataUrlToFile(preview, 'size-drawing.png'));
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

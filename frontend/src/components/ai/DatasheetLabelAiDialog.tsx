'use client';

import { FormEvent, useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import AiImageWorkbenchDialog from './AiImageWorkbenchDialog';
import { dataUrlToFile } from '@/lib/sizeDrawingCropClient';

type Props = {
  open: boolean;
  text: string;
  sourceDataUrl?: string | null;
  onClose: () => void;
  onApply: (file: File) => Promise<void>;
};

export default function DatasheetLabelAiDialog({
  open,
  text,
  sourceDataUrl,
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
      const res = await fetch('/api/admin/ai/generate-datasheet-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          instruction: refine || undefined,
          imageDataUrl: refine ? preview || sourceDataUrl : sourceDataUrl || undefined,
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
    if (open && text.trim()) {
      setPreview(null);
      setInstruction('');
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text, sourceDataUrl]);

  if (!open) return null;

  async function handleRefine(e: FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return;
    await generate(instruction.trim());
    setInstruction('');
  }

  return (
    <AiImageWorkbenchDialog
      title="Datasheet label AI"
      slotLabel={text}
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
          Black square badge with white text, matching the datasheet icons.
        </p>
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Refine (e.g. stack AC on a second line)"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            helpKey="admin.product_series.label_ai_refine"
            type="submit"
            variant="secondary"
            disabled={loading || !instruction.trim()}
          >
            Refine
          </Button>
          <HelpButton
            helpKey="admin.product_series.label_ai_apply"
            type="button"
            disabled={!preview || loading || applying}
            className="btn-primary text-sm disabled:opacity-60"
            onClick={async () => {
              if (!preview) return;
              setApplying(true);
              try {
                await onApply(dataUrlToFile(preview, 'datasheet-label.png'));
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

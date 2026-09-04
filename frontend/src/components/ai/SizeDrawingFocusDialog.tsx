'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import type { NormalizedBbox } from '@/lib/sizeDrawingCropClient';
import { cropImageUrlToDataUrl } from '@/lib/sizeDrawingCropClient';

type Props = {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onContinue: (croppedDataUrl: string) => void;
};

export default function SizeDrawingFocusDialog({ imageUrl, open, onClose, onContinue }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [bbox, setBbox] = useState<NormalizedBbox>({ x: 0, y: 0, width: 1, height: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setBbox({ x: 0, y: 0, width: 1, height: 1 });
  }, [open, imageUrl]);

  if (!open) return null;

  function clientToNorm(e: React.MouseEvent) {
    const el = imgRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  async function handleContinue() {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await cropImageUrlToDataUrl(imageUrl, bbox);
      onContinue(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
        <h2 className="text-xl font-bold mb-2">Focus the fixture</h2>
        <p className="text-sm text-gray-600 mb-4">
          Drag on the photo to crop the fixture. Starts full-frame. Continue to generate the size
          drawing.
        </p>
        <div className="bg-gray-100 rounded overflow-hidden mb-4 select-none flex justify-center">
          <div className="relative inline-block max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Main photo"
              className="max-w-full object-contain max-h-[420px]"
              draggable={false}
              onMouseDown={(e) => {
                const p = clientToNorm(e);
                drag.current = p;
                setBbox({ x: p.x, y: p.y, width: 0.02, height: 0.02 });
              }}
              onMouseMove={(e) => {
                if (!drag.current) return;
                const p = clientToNorm(e);
                const x = Math.min(drag.current.x, p.x);
                const y = Math.min(drag.current.y, p.y);
                setBbox({
                  x,
                  y,
                  width: Math.max(0.02, Math.abs(p.x - drag.current.x)),
                  height: Math.max(0.02, Math.abs(p.y - drag.current.y)),
                });
              }}
              onMouseUp={() => {
                drag.current = null;
              }}
            />
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
              style={{
                left: `${bbox.x * 100}%`,
                top: `${bbox.y * 100}%`,
                width: `${bbox.width * 100}%`,
                height: `${bbox.height * 100}%`,
              }}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            helpKey="admin.product_series.size_drawing_ai_cancel"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            helpKey="admin.product_series.size_drawing_ai_focus"
            disabled={busy}
            onClick={handleContinue}
          >
            {busy ? 'Cropping…' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

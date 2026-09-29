'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import Button from '@/components/ui/Button';
import { cropImageByEdges, type EdgeCrop } from '@/lib/image-cutboard';

type EdgeName = 'left' | 'right' | 'top' | 'bottom';

type EdgeCropBoardProps = {
  imageSrc: string;
  sourceName?: string;
  title?: string;
  hint?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const MIN_SPAN = 0.08;
const FULL_EDGES: EdgeCrop = { left: 0, top: 0, right: 1, bottom: 1 };

function moveEdge(edges: EdgeCrop, edge: EdgeName, value: number): EdgeCrop {
  const next = { ...edges };
  const v = Math.min(1, Math.max(0, value));
  if (edge === 'left') next.left = Math.min(v, edges.right - MIN_SPAN);
  if (edge === 'right') next.right = Math.max(v, edges.left + MIN_SPAN);
  if (edge === 'top') next.top = Math.min(v, edges.bottom - MIN_SPAN);
  if (edge === 'bottom') next.bottom = Math.max(v, edges.top + MIN_SPAN);
  return next;
}

export default function EdgeCropBoard({
  imageSrc,
  sourceName = 'image.jpg',
  title = 'Adjust photo',
  hint = 'Drag one edge at a time. The other three stay where they are.',
  confirmLabel = 'Apply crop',
  onCancel,
  onConfirm,
}: EdgeCropBoardProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState<EdgeCrop>(FULL_EDGES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEdges(FULL_EDGES);
    setError(null);
  }, [imageSrc]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function startEdgeDrag(edge: EdgeName, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const frame = frameRef.current;
    if (!frame) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = frame.getBoundingClientRect();

    const drag = (move: PointerEvent) => {
      const x = (move.clientX - rect.left) / rect.width;
      const y = (move.clientY - rect.top) / rect.height;
      setEdges((current) => moveEdge(current, edge, edge === 'left' || edge === 'right' ? x : y));
    };
    const stop = () => {
      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', drag);
    window.addEventListener('pointerup', stop);
  }

  async function handleApply() {
    setBusy(true);
    setError(null);
    try {
      const file = await cropImageByEdges(imageSrc, edges, sourceName);
      onConfirm(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop');
    } finally {
      setBusy(false);
    }
  }

  const cropStyle = {
    left: `${edges.left * 100}%`,
    top: `${edges.top * 100}%`,
    width: `${(edges.right - edges.left) * 100}%`,
    height: `${(edges.bottom - edges.top) * 100}%`,
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">{hint}</p>
        <div className="bg-gray-900 rounded p-6 mb-4 flex justify-center">
          <div ref={frameRef} className="relative inline-block max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              className="block max-w-full max-h-[60vh] w-auto h-auto select-none"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/55" style={{ height: `${edges.top * 100}%` }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55" style={{ height: `${(1 - edges.bottom) * 100}%` }} />
            <div
              className="pointer-events-none absolute left-0 bg-black/55"
              style={{ top: `${edges.top * 100}%`, width: `${edges.left * 100}%`, height: `${(edges.bottom - edges.top) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute right-0 bg-black/55"
              style={{ top: `${edges.top * 100}%`, width: `${(1 - edges.right) * 100}%`, height: `${(edges.bottom - edges.top) * 100}%` }}
            />
            <div className="pointer-events-none absolute border-2 border-white" style={cropStyle} />
            <EdgeHandle edge="left" style={{ left: cropStyle.left, top: cropStyle.top, height: cropStyle.height }} onPointerDown={startEdgeDrag} />
            <EdgeHandle edge="right" style={{ left: `${edges.right * 100}%`, top: cropStyle.top, height: cropStyle.height }} onPointerDown={startEdgeDrag} />
            <EdgeHandle edge="top" style={{ left: cropStyle.left, top: cropStyle.top, width: cropStyle.width }} onPointerDown={startEdgeDrag} />
            <EdgeHandle edge="bottom" style={{ left: cropStyle.left, top: `${edges.bottom * 100}%`, width: cropStyle.width }} onPointerDown={startEdgeDrag} />
          </div>
        </div>
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button helpKey="admin.image_cutboard.cancel" variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button helpKey="admin.image_cutboard.apply" disabled={busy} onClick={() => void handleApply()}>
            {busy ? 'Cropping…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EdgeHandle({
  edge,
  style,
  onPointerDown,
}: {
  edge: EdgeName;
  style: CSSProperties;
  onPointerDown: (edge: EdgeName, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const vertical = edge === 'left' || edge === 'right';
  return (
    <button
      type="button"
      aria-label={`Cut ${edge} edge`}
      className={`absolute z-10 touch-none ${
        vertical
          ? 'w-4 -translate-x-1/2 cursor-ew-resize before:absolute before:inset-y-0 before:left-1/2 before:w-1 before:-translate-x-1/2 before:bg-white'
          : 'h-4 -translate-y-1/2 cursor-ns-resize before:absolute before:inset-x-0 before:top-1/2 before:h-1 before:-translate-y-1/2 before:bg-white'
      }`}
      style={style}
      onPointerDown={(event) => onPointerDown(edge, event)}
    />
  );
}

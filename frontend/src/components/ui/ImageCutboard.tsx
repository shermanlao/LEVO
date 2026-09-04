'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import {
  centeredContainOffset,
  clampOffset,
  cropImageToFrameFile,
  displayScale,
  maxCutboardZoom,
  type CutboardTransform,
} from '@/lib/image-cutboard';
import type { ImageFrame } from '@/lib/image-frames';

type ImageCutboardProps = {
  imageSrc: string;
  frame: ImageFrame;
  sourceName?: string;
  title?: string;
  hint?: string;
  confirmLabel?: string;
  extraActions?: ReactNode;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const MIN_ZOOM = 1;

export default function ImageCutboard({
  imageSrc,
  frame,
  sourceName = 'image.jpg',
  title = 'Fit image to placeholder',
  hint,
  confirmLabel = 'Apply crop',
  extraActions,
  onCancel,
  onConfirm,
}: ImageCutboardProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }, [imageSrc, frame.key]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [imageSrc, frame.key]);

  const centeredKey = useRef('');
  useEffect(() => {
    if (!imgSize.w || !imgSize.h || !viewSize.w || !viewSize.h) return;
    const key = `${imageSrc}:${frame.key}:${imgSize.w}x${imgSize.h}`;
    if (centeredKey.current === key) return;
    centeredKey.current = key;
    const next = centeredContainOffset(imgSize.w, imgSize.h, viewSize.w, viewSize.h);
    setZoom(1);
    setOffset({ x: next.offsetX, y: next.offsetY });
  }, [imageSrc, imgSize.w, imgSize.h, viewSize.w, viewSize.h]);

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

  const zoomMax =
    imgSize.w && imgSize.h && viewSize.w && viewSize.h
      ? maxCutboardZoom(imgSize.w, imgSize.h, viewSize.w, viewSize.h)
      : 4;

  function applyOffset(nextZoom: number, nextX: number, nextY: number) {
    if (!imgSize.w || !imgSize.h || !viewSize.w || !viewSize.h) {
      setOffset({ x: nextX, y: nextY });
      return;
    }
    const next = clampOffset(nextZoom, nextX, nextY, imgSize.w, imgSize.h, viewSize.w, viewSize.h);
    setOffset({ x: next.offsetX, y: next.offsetY });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    applyOffset(
      zoom,
      drag.current.ox + (event.clientX - drag.current.x),
      drag.current.oy + (event.clientY - drag.current.y)
    );
  }

  function handlePointerUp() {
    drag.current = null;
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const next = Math.min(zoomMax, Math.max(MIN_ZOOM, zoom + (event.deltaY < 0 ? 0.12 : -0.12)));
    setZoom(next);
    applyOffset(next, offset.x, offset.y);
  }

  function handleZoomChange(value: number) {
    setZoom(value);
    applyOffset(value, offset.x, offset.y);
  }

  async function handleApply() {
    if (!viewSize.w || !viewSize.h) return;
    setBusy(true);
    setError(null);
    try {
      const transform: CutboardTransform = { zoom, offsetX: offset.x, offsetY: offset.y };
      const file = await cropImageToFrameFile(
        imageSrc,
        frame,
        transform,
        viewSize.w,
        viewSize.h,
        sourceName
      );
      onConfirm(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop');
    } finally {
      setBusy(false);
    }
  }

  const scale =
    imgSize.w && imgSize.h && viewSize.w && viewSize.h
      ? displayScale(zoom, imgSize.w, imgSize.h, viewSize.w, viewSize.h)
      : 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">
          {hint ||
            `The frame is the public ${frame.label} placeholder. Starts with the whole photo. Zoom in and drag so the fixture fills the box.`}
        </p>
        <div className="bg-gray-900 rounded p-4 mb-4 flex justify-center">
          <div
            ref={viewportRef}
            className={`relative w-full max-w-xl overflow-hidden bg-black cursor-grab active:cursor-grabbing touch-none ${frame.className}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                width: imgSize.w ? imgSize.w * scale : '100%',
                height: imgSize.h ? imgSize.h * scale : 'auto',
                left: offset.x,
                top: offset.y,
              }}
              onLoad={(event) => {
                const el = event.currentTarget;
                setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
              }}
            />
            <div className="pointer-events-none absolute inset-0 ring-2 ring-white/80 ring-inset" />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm text-gray-700 mb-4">
          <span className="w-12 shrink-0">Zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={zoomMax}
            step={0.05}
            value={Math.min(zoom, zoomMax)}
            onChange={(event) => handleZoomChange(Number(event.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right tabular-nums">{zoom.toFixed(1)}×</span>
        </label>
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          {extraActions}
          <Button
            helpKey="admin.image_cutboard.cancel"
            variant="secondary"
            disabled={busy}
            onClick={onCancel}
          >
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

type CutboardJob = {
  url: string;
  revoke: boolean;
  fileName: string;
  frame: ImageFrame;
};

/**
 * Recallable upload helper: pick a file or existing URL, crop it to a placeholder frame.
 */
export function useImageCutboard() {
  const [job, setJob] = useState<CutboardJob | null>(null);
  const resolveRef = useRef<((file: File | null) => void) | null>(null);
  const urlRef = useRef<string | null>(null);

  const finish = useCallback((file: File | null) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setJob(null);
    resolve?.(file);
  }, []);

  const startJob = useCallback((url: string, revoke: boolean, fileName: string, frame: ImageFrame) => {
    return new Promise<File | null>((resolve) => {
      if (resolveRef.current) resolveRef.current(null);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = revoke ? url : null;
      resolveRef.current = resolve;
      setJob({ url, revoke, fileName, frame });
    });
  }, []);

  const requestCrop = useCallback(
    (file: File, frame: ImageFrame) => startJob(URL.createObjectURL(file), true, file.name, frame),
    [startJob]
  );

  const requestCropSrc = useCallback(
    (src: string, frame: ImageFrame, sourceName = 'image.jpg') => startJob(src, false, sourceName, frame),
    [startJob]
  );

  const cutboard = job ? (
    <ImageCutboard
      imageSrc={job.url}
      frame={job.frame}
      sourceName={job.fileName}
      onCancel={() => finish(null)}
      onConfirm={(file) => finish(file)}
    />
  ) : null;

  return { requestCrop, requestCropSrc, cutboard };
}

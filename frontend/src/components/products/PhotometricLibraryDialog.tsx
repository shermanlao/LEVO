'use client';

import { useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import { saveProductLdtOptions } from '@/lib/ldt-options';

type LdtOptions = {
  family: 'circular' | 'linear';
  beamDegrees: number;
  familyMessage: string;
  beamMessage: string;
  circularBeams: number[];
  linearBeams: number[];
  preview: {
    lumen: number | null;
    wattage: number | null;
    cct: string | null;
    cri: string | null;
    sizeLabel: string | null;
    downloadName: string;
    canDownload: boolean;
  };
};

type Props = {
  productId: number;
  open: boolean;
  onClose: () => void;
  onSaved: (photometricImage: string) => void;
};

export default function PhotometricLibraryDialog({ productId, open, onClose, onSaved }: Props) {
  const [options, setOptions] = useState<LdtOptions | null>(null);
  const [family, setFamily] = useState<'circular' | 'linear'>('circular');
  const [beamDegrees, setBeamDegrees] = useState(24);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    fetch(`/api/products/${productId}/ldt-options`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load library');
        return data as LdtOptions;
      })
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        setFamily(data.family);
        setBeamDegrees(data.beamDegrees);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load library');
      });
    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const urlRef = { current: null as string | null };
    setLoading(true);
    fetch(
      `/api/photometric-library/ldt?family=${encodeURIComponent(family)}&beamDegrees=${beamDegrees}`,
      { cache: 'no-store' }
    )
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load LDT');
        }
        return res.text();
      })
      .then((ldtText) =>
        fetch('/api/admin/photometric-library/polar-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ldtText }),
        })
      )
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to render polar');
        }
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render polar');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [open, family, beamDegrees]);

  if (!open) return null;

  const beams = family === 'linear' ? options?.linearBeams || [] : options?.circularBeams || [];

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      const { photometricImage } = await saveProductLdtOptions(productId, family, beamDegrees);
      onSaved(photometricImage);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photometric image');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Generate photometric from library</h2>
          <button type="button" className="text-gray-500 hover:text-gray-800" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Pick a shape and library beam. Confirm saves those options, the polar drawing, and the
          catalog LDT download for this product.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Shape</span>
            <select
              data-help-key="admin.products.ldt_shape"
              className="border border-gray-300 rounded px-3 py-2"
              value={family}
              onChange={(e) => setFamily(e.target.value as 'circular' | 'linear')}
            >
              <option value="circular">Circular</option>
              <option value="linear">Linear</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Library beam</span>
            <select
              data-help-key="admin.products.ldt_beam"
              className="border border-gray-300 rounded px-3 py-2"
              value={beamDegrees}
              onChange={(e) => setBeamDegrees(Number(e.target.value))}
            >
              {beams.map((deg) => (
                <option key={deg} value={deg}>
                  {deg}°
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="aspect-[5/4] bg-gray-100 rounded flex items-center justify-center mb-4 overflow-hidden">
          {loading ? (
            <p className="text-gray-500 text-sm">Rendering polar…</p>
          ) : previewUrl ? (
            <img src={previewUrl} alt="Photometric polar preview" className="object-contain max-h-full" />
          ) : (
            <p className="text-gray-500 text-sm">No preview</p>
          )}
        </div>
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded border" onClick={onClose}>
            Cancel
          </button>
          <HelpButton
            helpKey="admin.products.photometric_library"
            type="button"
            disabled={!previewUrl || confirming || loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            onClick={handleConfirm}
          >
            {confirming ? 'Saving…' : 'Confirm'}
          </HelpButton>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import HelpButton, { HelpLink } from '@/components/admin/HelpButton';
import { FileDownloadIcon } from './ProductFileIcons';
import { saveProductLdtOptions } from '@/lib/ldt-options';
import { getLdtUrl } from '@/lib/sqlite-api';

type LdtOptions = {
  family: 'circular' | 'linear';
  beamDegrees: number;
  saved?: boolean;
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
  productId: number | string;
  /** Shape / library-beam pickers. Off on the public catalog. */
  editable?: boolean;
  variant?: 'catalog' | 'admin';
  compact?: boolean;
  className?: string;
  onOptionsSaved?: (photometricImage: string) => void;
};

export default function ProductLdtDownload({
  productId,
  editable = false,
  variant = 'catalog',
  compact = false,
  className,
  onOptionsSaved,
}: Props) {
  const [options, setOptions] = useState<LdtOptions | null>(null);
  const [family, setFamily] = useState<'circular' | 'linear'>('circular');
  const [beamDegrees, setBeamDegrees] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(editable);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);

  const downloadHelpKey = editable ? 'admin.products.ldt_download' : 'catalog.ldt.download';
  const downloadClass =
    className ||
    (compact
      ? 'btn-primary inline-flex items-center text-sm py-1 px-2 whitespace-nowrap disabled:opacity-60'
      : variant === 'admin'
        ? 'flex-1 inline-flex items-center justify-center bg-gray-800 text-white text-center py-2 px-3 rounded-md text-sm font-medium disabled:opacity-60'
        : 'btn-primary inline-flex items-center disabled:opacity-60');
  const iconClass = compact ? 'mr-1 h-4 w-4' : undefined;

  useEffect(() => {
    if (!editable) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/${productId}/ldt-options`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load LDT options');
        return data as LdtOptions;
      })
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        setFamily(data.family);
        setBeamDegrees(data.beamDegrees);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load LDT options');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, editable]);

  if (!editable) {
    return (
      <HelpLink
        helpKey={downloadHelpKey}
        href={getLdtUrl(productId)}
        download
        className={downloadClass}
      >
        <FileDownloadIcon className={iconClass} />
        LDT
      </HelpLink>
    );
  }

  const beams = family === 'linear' ? options?.linearBeams || [] : options?.circularBeams || [];

  function applyFamily(next: 'circular' | 'linear') {
    setFamily(next);
    const list = next === 'linear' ? options?.linearBeams || [] : options?.circularBeams || [];
    if (list.length && !list.includes(beamDegrees)) {
      setBeamDegrees(list.includes(60) ? 60 : list[0]);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const query = `?family=${encodeURIComponent(family)}&beamDegrees=${beamDegrees}`;
      const res = await fetch(`/api/products/${productId}/ldt${query}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download LDT');
      }
      const blob = await res.blob();
      const name =
        res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
        options?.preview.downloadName ||
        'product.ldt';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download LDT');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSaveOptions() {
    setSaving(true);
    setError(null);
    try {
      const { photometricImage } = await saveProductLdtOptions(productId, family, beamDegrees);
      setOptions((prev) =>
        prev
          ? {
              ...prev,
              family,
              beamDegrees,
              saved: true,
              familyMessage: `Saved ${family} ${beamDegrees}° for catalog LDT and polar image.`,
              beamMessage: `Saved library beam: ${beamDegrees}°.`,
            }
          : prev
      );
      onOptionsSaved?.(photometricImage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save polar options');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Shape</span>
          <select
            data-help-key="admin.products.ldt_shape"
            className="border border-gray-300 rounded px-3 py-2 text-sm"
            value={family}
            onChange={(e) => applyFamily(e.target.value as 'circular' | 'linear')}
            disabled={loading || saving}
          >
            <option value="circular">Circular</option>
            <option value="linear">Linear</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Library beam</span>
          <select
            data-help-key="admin.products.ldt_beam"
            className="border border-gray-300 rounded px-3 py-2 text-sm"
            value={beamDegrees}
            onChange={(e) => setBeamDegrees(Number(e.target.value))}
            disabled={loading || saving}
          >
            {beams.map((deg) => (
              <option key={deg} value={deg}>
                {deg}°
              </option>
            ))}
          </select>
        </label>
        <HelpButton
          helpKey={downloadHelpKey}
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className={downloadClass}
        >
          {downloading ? (
            'Preparing…'
          ) : (
            <>
              <FileDownloadIcon className={iconClass} />
              LDT
            </>
          )}
        </HelpButton>
        <HelpButton
          helpKey="admin.products.ldt_save"
          type="button"
          onClick={handleSaveOptions}
          disabled={loading || saving}
          className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-md text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save polar options'}
        </HelpButton>
      </div>
      {options?.familyMessage ? <p className="text-xs text-gray-500">{options.familyMessage}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

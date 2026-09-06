'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';
import Button from '@/components/ui/Button';
import ImageFileIntake from '@/components/ui/ImageFileIntake';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { SITE_SLOT_FRAMES, validateImageFile } from '@/lib/image-frames';
import { IMAGE_INTAKE_HINT } from '@/lib/image-file-intake';

type Slot = 'header' | 'pdf' | 'icon' | 'hero' | 'og';

export default function SiteAssetUploader({
  slot,
  label,
  hint,
  imagePath,
  uploadHelpKey,
  removeHelpKey,
  onUploaded,
  onRemoved,
}: {
  slot: Slot;
  label: string;
  hint: string;
  imagePath: string;
  uploadHelpKey: string;
  removeHelpKey: string;
  onUploaded: (path: string) => void;
  onRemoved: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { requestCrop, cutboard } = useImageCutboard();
  const [preview, setPreview] = useState(imagePath);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  useEffect(() => {
    setPreview(imagePath);
    setRefreshKey(Date.now());
  }, [imagePath]);

  async function takeFile(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    const cropped = await requestCrop(file, SITE_SLOT_FRAMES[slot]);
    if (!cropped) return;
    setUploading(true);
    setError(null);
    const objectUrl = URL.createObjectURL(cropped);
    setPreview(objectUrl);
    try {
      const body = new FormData();
      body.append('file', cropped);
      body.append('slot', slot);
      const res = await fetch('/api/admin/site-settings/logo', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const path =
        slot === 'hero'
          ? String(data.data?.hero_image || '')
          : slot === 'og'
            ? String(data.data?.og_image || '')
            : String(data.data?.[`logo_${slot}`] || '');
      setPreview(path || objectUrl);
      setRefreshKey(Date.now());
      onUploaded(path);
    } catch (err) {
      setPreview(imagePath);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await takeFile(file);
  }

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/site-settings/logo?slot=${slot}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      setPreview('');
      onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setRemoving(false);
    }
  }

  const src = preview
    ? `${preview}${preview.startsWith('blob:') ? '' : `${preview.includes('?') ? '&' : '?'}t=${refreshKey}`}`
    : null;

  return (
    <div>
      <p className="admin-field-label">{label}</p>
      <p className="text-sm text-gray-500 mb-2">{hint}</p>
      <div className="border rounded-lg overflow-hidden bg-white max-w-xs">
        <ImageFileIntake
          enabled={!uploading && !removing}
          clickToPick={!src}
          helpKey={uploadHelpKey}
          onFile={(file) => void takeFile(file)}
        >
        <AdminHoverPreview src={src} className="block">
        <div className={`${SITE_SLOT_FRAMES[slot].className} bg-gray-100 flex items-center justify-center`}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={label}
              className={`${slot === 'hero' || slot === 'og' ? 'object-cover' : 'object-contain p-2'} w-full h-full`}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center px-3">{IMAGE_INTAKE_HINT}</p>
          )}
        </div>
        </AdminHoverPreview>
        </ImageFileIntake>
        <div className="p-3 flex gap-2">
          <Button
            helpKey={uploadHelpKey}
            type="button"
            disabled={uploading || removing}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || removing}
          />
          {preview ? (
            <Button
              helpKey={removeHelpKey}
              type="button"
              variant="danger"
              disabled={uploading || removing}
              onClick={() => void handleRemove()}
            >
              Use default
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {cutboard}
    </div>
  );
}

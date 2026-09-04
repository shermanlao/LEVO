'use client';

import { useEffect, useRef, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { IMAGE_FRAMES, validateImageFile } from '@/lib/image-frames';

type Props = {
  imagePath: string | null;
  onUploaded: (path: string) => void;
  onRemoved: () => void;
};

export default function SizeDrawingStyleUploader({ imagePath, onUploaded, onRemoved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { requestCrop, cutboard } = useImageCutboard();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  useEffect(() => {
    setPreview(imagePath || null);
    setRefreshKey(Date.now());
  }, [imagePath]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    const cropped = await requestCrop(file, IMAGE_FRAMES.product);
    if (!cropped) return;
    setUploading(true);
    setError(null);
    setUploadSuccess(false);
    const objectUrl = URL.createObjectURL(cropped);
    setPreview(objectUrl);
    try {
      const formData = new FormData();
      formData.append('file', cropped);
      const res = await fetch('/api/admin/ai/size-drawing-style', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const nextPath = String(data.data?.size_drawing_style_image || '');
      setPreview(nextPath || objectUrl);
      setRefreshKey(Date.now());
      setUploadSuccess(true);
      onUploaded(nextPath);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setPreview(imagePath || null);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove the size drawing style reference?')) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/size-drawing-style', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      setPreview(null);
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
      <p className="text-sm text-gray-500 mb-2">
        Optional 2D size drawing used as the style for Generate by AI. The product crop still
        supplies the fixture outline.
      </p>
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm max-w-xs">
        <div className="p-3 bg-gray-50 border-b">
          <h3 className="font-medium text-gray-800">Size drawing style</h3>
        </div>
        <div className="aspect-square relative overflow-hidden bg-gray-100 flex items-center justify-center">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Size drawing style reference" className="object-contain w-full h-full p-2" />
          ) : (
            <div className="text-center p-4">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No image uploaded</p>
            </div>
          )}
        </div>
        <div className="p-3 flex gap-2">
          <HelpButton
            helpKey="admin.ai.size_drawing_style_upload"
            type="button"
            disabled={uploading || removing}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading...' : uploadSuccess ? 'Uploaded!' : 'Upload Image'}
          </HelpButton>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || removing}
          />
          {preview ? (
            <HelpButton
              helpKey="admin.ai.size_drawing_style_remove"
              type="button"
              disabled={uploading || removing}
              className="bg-red-100 text-red-600 hover:bg-red-200 py-2 px-3 rounded-md text-sm font-medium disabled:opacity-60"
              onClick={() => void handleRemove()}
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </HelpButton>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {cutboard}
    </div>
  );
}

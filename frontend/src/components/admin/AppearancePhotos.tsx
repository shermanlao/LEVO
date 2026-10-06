'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminPhotoSlot from '@/components/admin/AdminPhotoSlot';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import OptionTag from '@/components/ui/OptionTag';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import ImageFileIntake from '@/components/ui/ImageFileIntake';
import { adminFetchJson, uploadAdminImage } from '@/lib/admin-fetch';
import { storedProductImagePath, toPublicImagePath } from '@/lib/image-utils';
import { dataUrlToFile, imageUrlToDataUrl } from '@/lib/sizeDrawingCropClient';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { IMAGE_FRAMES, validateImageFile } from '@/lib/image-frames';
import ProductPhotoStyleDialog from '@/components/ai/ProductPhotoStyleDialog';
import {
  PHOTO_TAG_KINDS,
  appearanceAiSourcePath,
  appearanceAxisValues,
  appearanceComboLabel,
  normalizeAppearanceCombo,
  unusedAppearancePhotos,
  type AppearanceCombo,
  type AppearancePhotoDto,
  type PhotoTagKind,
} from '@shared/appearance-photos';
import { groupOptionsByKind, optionText, valuesEqual, variantKindLabel, type SeriesOptionDto } from '@shared/series-options';

type AppearancePhotosProps = {
  seriesId: number;
  seriesSlug: string;
  options: SeriesOptionDto[];
  photos: AppearancePhotoDto[];
  seriesImageUrl?: string;
  fixtureDescription?: string;
  onPhotosChange?: (photos: AppearancePhotoDto[]) => void;
};

function unwrapSavedPhoto(payload: unknown): AppearancePhotoDto | null {
  if (!payload || typeof payload !== 'object') return null;
  const rec = payload as { data?: AppearancePhotoDto } & Partial<AppearancePhotoDto>;
  if (rec.data && typeof rec.data === 'object' && rec.data.main_image_A) return rec.data;
  if (rec.main_image_A) return rec as AppearancePhotoDto;
  return rec.data || null;
}

function photoKey(photo: AppearancePhotoDto, fallback: number): string {
  return photo.id != null ? String(photo.id) : `new-${fallback}`;
}

function emptyCombo(): AppearanceCombo {
  return { colour: '', trim_color: '', reflector_finish: '', size: '' };
}

function comboFromPhoto(photo: AppearancePhotoDto): AppearanceCombo {
  return normalizeAppearanceCombo(photo);
}

export default function AppearancePhotos({
  seriesId,
  seriesSlug,
  options,
  photos,
  seriesImageUrl = '',
  fixtureDescription = '',
  onPhotosChange,
}: AppearancePhotosProps) {
  const grouped = useMemo(() => groupOptionsByKind(options), [options]);
  const [localPhotos, setLocalPhotos] = useState(photos);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPhotoStyle, setHasPhotoStyle] = useState<boolean | null>(null);
  const [stylePhoto, setStylePhoto] = useState<AppearancePhotoDto | null>(null);
  const { requestCrop, cutboard } = useImageCutboard();
  const photosRef = useRef(localPhotos);
  const pendingRef = useRef(pending);
  photosRef.current = localPhotos;
  pendingRef.current = pending;

  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/ai/settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setHasPhotoStyle(Boolean(data.data?.product_photo_style_image));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const leftover = useMemo(() => unusedAppearancePhotos(localPhotos, grouped), [grouped, localPhotos]);
  const leftoverIds = useMemo(() => new Set(leftover.map((photo) => photo.id)), [leftover]);
  const pendingKeys = Object.keys(pending);

  function commitPhotos(next: AppearancePhotoDto[]) {
    setLocalPhotos(next);
    photosRef.current = next;
    onPhotosChange?.(next);
  }

  function upsertPhoto(photo: AppearancePhotoDto) {
    const id = photo.id;
    const list = photosRef.current;
    if (id != null && list.some((row) => row.id === id)) {
      commitPhotos(list.map((row) => (row.id === id ? photo : row)));
      return;
    }
    commitPhotos([...list, photo]);
  }

  function setPendingPhoto(key: string, dataUrl: string | null) {
    setPending((prev) => {
      const next = { ...prev };
      if (dataUrl) next[key] = dataUrl;
      else delete next[key];
      pendingRef.current = next;
      return next;
    });
  }

  async function persistPhoto(input: {
    combo: AppearanceCombo;
    file?: File;
    generated?: boolean;
    id?: number;
    existingPath?: string;
  }): Promise<AppearancePhotoDto> {
    let path = input.existingPath || '';
    if (input.file) {
      const uploaded = await uploadAdminImage(input.file, { seriesSlug, imageType: 'appearance' });
      if (!uploaded.ok) throw new Error(uploaded.error);
      const fileInfo =
        (uploaded.data as { files?: Array<{ url?: string; filename?: string }> }).files?.[0] || uploaded.data;
      path = storedProductImagePath(
        {
          url: (fileInfo as { url?: string }).url,
          fileName: (fileInfo as { filename?: string }).filename,
        },
        seriesSlug
      );
    }
    const body: Record<string, unknown> = {
      ...input.combo,
      source_product_id: null,
    };
    if (input.id) body.id = input.id;
    if (path) body.main_image_A = path;
    if (input.generated !== undefined) body.generated_by_ai = input.generated;
    const saved = await adminFetchJson<{ data: AppearancePhotoDto }>(
      `/product-series/${seriesId}/appearance-photos`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!saved.ok) throw new Error(saved.error);
    const photo = unwrapSavedPhoto(saved.data) || {
      ...input.combo,
      id: input.id,
      main_image_A: path,
      source_product_id: null,
      generated_by_ai: Boolean(input.generated),
    };
    upsertPhoto(photo);
    if (photo.id != null) setPendingPhoto(String(photo.id), null);
    return photo;
  }

  async function generateOne(photo: AppearancePhotoDto, sourceDataUrl: string) {
    const combo = comboFromPhoto(photo);
    const key = photoKey(photo, 0);
    setBusyKey(key);
    const res = await fetch('/api/admin/ai/generate-appearance-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: sourceDataUrl,
        colour: combo.colour || undefined,
        trim_color: combo.trim_color || undefined,
        reflector_finish: combo.reflector_finish || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Generate failed');
    const dataUrl = String((data as { imageDataUrl?: string }).imageDataUrl || '');
    if (!dataUrl.startsWith('data:')) throw new Error('Generate failed');
    setPendingPhoto(key, dataUrl);
  }

  async function confirmPhoto(photo: AppearancePhotoDto) {
    const key = photoKey(photo, 0);
    const dataUrl = pendingRef.current[key];
    if (!dataUrl) return;
    setBusyKey(key);
    setError(null);
    try {
      const file = dataUrlToFile(dataUrl, `appearance-${key}.png`);
      await persistPhoto({
        combo: comboFromPhoto(photo),
        file,
        generated: true,
        id: photo.id,
      });
      showSaveNotice('Appearance photo saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      showSaveNotice(message, 'error');
    } finally {
      setBusyKey(null);
    }
  }

  async function confirmAllPending() {
    const targets = localPhotos.filter((photo) => pendingRef.current[photoKey(photo, 0)]);
    if (!targets.length) return;
    setError(null);
    try {
      for (const photo of targets) {
        const key = photoKey(photo, 0);
        setBusyKey(key);
        const dataUrl = pendingRef.current[key];
        if (!dataUrl) continue;
        const file = dataUrlToFile(dataUrl, `appearance-${key}.png`);
        await persistPhoto({
          combo: comboFromPhoto(photo),
          file,
          generated: true,
          id: photo.id,
        });
      }
      showSaveNotice('Appearance photos saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      showSaveNotice(message, 'error');
    } finally {
      setBusyKey(null);
    }
  }

  function discardAllPending() {
    setPending({});
    pendingRef.current = {};
  }

  async function uploadNew(file: File) {
    setBusyKey('add');
    setError(null);
    try {
      await persistPhoto({ combo: emptyCombo(), file, generated: false });
      showSaveNotice('Appearance photo saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusyKey(null);
    }
  }

  async function replacePhoto(photo: AppearancePhotoDto, file: File) {
    const key = photoKey(photo, 0);
    setBusyKey(key);
    setError(null);
    try {
      await persistPhoto({
        combo: comboFromPhoto(photo),
        file,
        generated: false,
        id: photo.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusyKey(null);
    }
  }

  function takeFile(file: File, photo?: AppearancePhotoDto) {
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    void requestCrop(file, IMAGE_FRAMES.product).then((cropped) => {
      if (!cropped) return;
      if (photo) void replacePhoto(photo, cropped);
      else void uploadNew(cropped);
    });
  }

  async function setPhotoTag(photo: AppearancePhotoDto, kind: PhotoTagKind, value: string) {
    if (photo.id == null || busyKey != null) return;
    const key = photoKey(photo, 0);
    setBusyKey(key);
    setError(null);
    try {
      await persistPhoto({
        combo: { ...comboFromPhoto(photo), [kind]: value },
        id: photo.id,
        existingPath: photo.main_image_A,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusyKey(null);
    }
  }

  async function removePhoto(photo: AppearancePhotoDto) {
    if (photo.id == null) return;
    const key = photoKey(photo, 0);
    setBusyKey(key);
    setError(null);
    const saved = await adminFetchJson(`/product-series/${seriesId}/appearance-photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: photo.id }),
    });
    setBusyKey(null);
    if (!saved.ok) {
      setError(saved.error);
      return;
    }
    setPendingPhoto(key, null);
    commitPhotos(photosRef.current.filter((row) => row.id !== photo.id));
  }

  const canConfirm = busyKey == null && pendingKeys.length > 0;
  const stylePhotoUrl = stylePhoto ? toPublicImagePath(stylePhoto.main_image_A) : '';

  function tagValues(kind: PhotoTagKind, selected: string): string[] {
    const values = appearanceAxisValues(grouped, kind);
    if (selected && !values.some((item) => valuesEqual(kind === 'size' ? 'size' : kind, item, selected))) {
      return [...values, selected];
    }
    return values;
  }

  function photoStatus(photo: AppearancePhotoDto, pendingSrc?: string) {
    if (pendingSrc) return 'Pending confirmation';
    if (leftoverIds.has(photo.id)) return 'Unused tags';
    return photo.generated_by_ai ? 'Generated' : 'Uploaded';
  }

  return (
    <div className="bg-white shadow-md rounded p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Appearance photos</h2>
          <HelpButton helpKey="admin.product_series.appearance_photos" type="button" className="text-xs text-gray-400">
            ?
          </HelpButton>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {pendingKeys.length > 0 ? (
            <>
              <Button
                helpKey="admin.product_series.appearance_confirm_all"
                disabled={!canConfirm}
                onClick={() => void confirmAllPending()}
              >
                Confirm all
              </Button>
              <Button
                helpKey="admin.product_series.appearance_discard_all"
                variant="ghost"
                disabled={!canConfirm}
                onClick={discardAllPending}
              >
                Discard all
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Upload as many photos as you need. Tag Finish, Trim, Reflector, and Size. A product row uses the most specific
        matching photo, then the next, down to an untagged photo, then the series photo.
      </p>
      <div className="space-y-4">
        {localPhotos.map((photo, index) => {
          const combo = comboFromPhoto(photo);
          const key = photoKey(photo, index);
          const pendingSrc = pending[key];
          const src = pendingSrc || toPublicImagePath(photo.main_image_A);
          const busy = busyKey === key;
          return (
            <div key={key} className="flex flex-wrap items-start gap-3 border border-gray-100 rounded p-3">
              <ImageFileIntake
                enabled={busyKey == null}
                clickToPick={!src}
                helpKey="admin.product_series.appearance_upload"
                className="inline-block"
                onFile={(file) => takeFile(file, photo)}
              >
                <AdminPhotoSlot src={src} alt={appearanceComboLabel(combo)} compact />
              </ImageFileIntake>
              <div className="min-w-[12rem] flex-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700">{appearanceComboLabel(combo)}</span>
                  <span className="text-xs text-gray-400 shrink-0">{photoStatus(photo, pendingSrc)}</span>
                </div>
                {PHOTO_TAG_KINDS.map((kind) => {
                  const selected = combo[kind];
                  const values = tagValues(kind, selected);
                  if (!values.length) return null;
                  return (
                    <div key={kind}>
                      <div className="text-xs text-gray-500 mb-1">{variantKindLabel(kind)}</div>
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => {
                          const on = valuesEqual(kind === 'size' ? 'size' : kind, selected, value);
                          return (
                            <OptionTag
                              key={`${kind}-${value}`}
                              helpKey="admin.product_series.appearance_tag"
                              selected={on}
                              onClick={() => void setPhotoTag(photo, kind, on ? '' : value)}
                            >
                              {value}
                            </OptionTag>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap items-center gap-2">
                  {pendingSrc ? (
                    <>
                      <Button
                        helpKey="admin.product_series.appearance_confirm"
                        className="text-xs py-1 px-2"
                        disabled={busyKey != null}
                        onClick={() => void confirmPhoto(photo)}
                      >
                        {busy ? 'Saving…' : 'Confirm'}
                      </Button>
                      <Button
                        helpKey="admin.product_series.appearance_discard"
                        variant="ghost"
                        className="text-xs"
                        disabled={busyKey != null}
                        onClick={() => setPendingPhoto(key, null)}
                      >
                        Discard
                      </Button>
                    </>
                  ) : null}
                  {busy && !pendingSrc ? <span className="text-xs text-gray-500">Working…</span> : null}
                  <Button
                    helpKey="admin.product_series.appearance_generate"
                    variant="secondary"
                    className="text-xs py-1 px-2"
                    disabled={
                      busyKey != null ||
                      !toPublicImagePath(
                        appearanceAiSourcePath(localPhotos, photo, [seriesImageUrl])
                      )
                    }
                    onClick={async () => {
                      const sourceUrl = toPublicImagePath(
                        appearanceAiSourcePath(localPhotos, photo, [seriesImageUrl])
                      );
                      if (!sourceUrl) return;
                      setError(null);
                      try {
                        const dataUrl = await imageUrlToDataUrl(sourceUrl);
                        await generateOne(photo, dataUrl);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Generate failed');
                      } finally {
                        setBusyKey(null);
                      }
                    }}
                  >
                    Generate by AI
                  </Button>
                  {src && !pendingSrc ? (
                    <Button
                      helpKey="admin.product_series.photo_style_match"
                      variant="secondary"
                      className="text-xs py-1 px-2"
                      disabled={busyKey != null}
                      onClick={() => {
                        if (hasPhotoStyle === false) {
                          setError('Upload a catalog photo style on /admin/ai first.');
                          return;
                        }
                        setError(null);
                        setStylePhoto(photo);
                      }}
                    >
                      Match catalog style
                    </Button>
                  ) : null}
                  {src ? (
                    <Button
                      helpKey="admin.product_series.appearance_upload"
                      variant="ghost"
                      className="text-xs"
                      disabled={busyKey != null}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = () => {
                          const file = input.files?.[0];
                          if (file) takeFile(file, photo);
                        };
                        input.click();
                      }}
                    >
                      Replace
                    </Button>
                  ) : null}
                  <Button
                    helpKey="admin.product_series.appearance_remove"
                    variant="ghost"
                    className="text-xs text-red-600"
                    disabled={busyKey != null}
                    onClick={() => void removePhoto(photo)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        <ImageFileIntake
          enabled={busyKey == null}
          helpKey="admin.product_series.appearance_add"
          className="block"
          onFile={(file) => takeFile(file)}
        >
          <div className="border border-dashed border-gray-200 rounded p-4 text-sm text-gray-500">
            Drop, paste, or choose a file to add a photo
          </div>
        </ImageFileIntake>
      </div>
      {error ? <p className="text-xs text-red-600 mt-3 whitespace-pre-line">{error}</p> : null}
      {cutboard}
      <ProductPhotoStyleDialog
        open={Boolean(stylePhoto && stylePhotoUrl)}
        imageUrl={stylePhotoUrl}
        photoType="appearance"
        fixtureDescription={fixtureDescription}
        onClose={() => setStylePhoto(null)}
        onApply={async (file) => {
          if (!stylePhoto) return;
          await persistPhoto({
            combo: comboFromPhoto(stylePhoto),
            file,
            generated: false,
            id: stylePhoto.id,
          });
        }}
      />
    </div>
  );
}

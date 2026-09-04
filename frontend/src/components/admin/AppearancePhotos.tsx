'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminPhotoSlot from '@/components/admin/AdminPhotoSlot';
import HelpButton from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { adminFetchJson, uploadAdminImage } from '@/lib/admin-fetch';
import { storedProductImagePath, toPublicImagePath } from '@/lib/image-utils';
import { dataUrlToFile, imageUrlToDataUrl } from '@/lib/sizeDrawingCropClient';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { IMAGE_FRAMES, validateImageFile } from '@/lib/image-frames';
import {
  appearanceComboKey,
  appearanceComboLabel,
  appearanceComboRows,
  unusedAppearancePhotos,
  APPEARANCE_KINDS,
  type AppearanceCombo,
  type AppearancePhotoDto,
} from '@shared/appearance-photos';
import { groupOptionsByKind, optionText, type SeriesOptionDto } from '@shared/series-options';

type AppearancePhotosProps = {
  seriesId: number;
  seriesSlug: string;
  options: SeriesOptionDto[];
  photos: AppearancePhotoDto[];
  sourceImageUrl: string;
  sourceProductId?: number;
  generateTick?: number;
  onPhotosChange?: (photos: AppearancePhotoDto[]) => void;
};

function photoForCombo(photos: AppearancePhotoDto[], combo: AppearanceCombo) {
  const key = appearanceComboKey(combo);
  return photos.find((photo) => appearanceComboKey(photo) === key) || null;
}

function isStaffUpload(photo: AppearancePhotoDto | null) {
  return Boolean(photo?.main_image_A) && photo?.generated_by_ai === false;
}

function unwrapSavedPhoto(payload: unknown): AppearancePhotoDto | null {
  if (!payload || typeof payload !== 'object') return null;
  const rec = payload as { data?: AppearancePhotoDto } & Partial<AppearancePhotoDto>;
  if (rec.data && typeof rec.data === 'object' && rec.data.main_image_A) return rec.data;
  if (rec.main_image_A) return rec as AppearancePhotoDto;
  return rec.data || null;
}

function comboFromPhoto(photo: AppearancePhotoDto): AppearanceCombo {
  return {
    colour: photo.colour || '',
    trim_color: photo.trim_color || '',
    reflector_finish: photo.reflector_finish || '',
  };
}

export default function AppearancePhotos({
  seriesId,
  seriesSlug,
  options,
  photos,
  sourceImageUrl,
  sourceProductId,
  generateTick = 0,
  onPhotosChange,
}: AppearancePhotosProps) {
  const grouped = useMemo(() => groupOptionsByKind(options), [options]);
  const combos = useMemo(() => appearanceComboRows(grouped), [grouped]);
  const [localPhotos, setLocalPhotos] = useState(photos);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requestCrop, cutboard } = useImageCutboard();
  const [progress, setProgress] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const queueRef = useRef(false);
  const photosRef = useRef(localPhotos);
  const pendingRef = useRef(pending);
  photosRef.current = localPhotos;
  pendingRef.current = pending;

  useEffect(() => {
    if (!queueRef.current) setLocalPhotos(photos);
  }, [photos]);

  const unused = useMemo(() => unusedAppearancePhotos(localPhotos, combos), [localPhotos, combos]);
  const pendingKeys = Object.keys(pending);
  const inUse = APPEARANCE_KINDS.some((kind) => (grouped[kind] || []).some((row) => optionText(row.value)));
  const allNa =
    inUse &&
    APPEARANCE_KINDS.every((kind) => {
      const list = grouped[kind] || [];
      return !list.length || list.every((row) => /^n\/a$/i.test(optionText(row.value)));
    });

  function commitPhotos(next: AppearancePhotoDto[]) {
    setLocalPhotos(next);
    photosRef.current = next;
    onPhotosChange?.(next);
  }

  function upsertPhoto(photo: AppearancePhotoDto) {
    const key = appearanceComboKey(photo);
    commitPhotos([...photosRef.current.filter((row) => appearanceComboKey(row) !== key), photo]);
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

  async function savePhoto(combo: AppearanceCombo, file: File, generated: boolean) {
    const uploaded = await uploadAdminImage(file, { seriesSlug, imageType: 'appearance' });
    if (!uploaded.ok) throw new Error(uploaded.error);
    const fileInfo =
      (uploaded.data as { files?: Array<{ url?: string; filename?: string }> }).files?.[0] || uploaded.data;
    const path = storedProductImagePath(
      {
        url: (fileInfo as { url?: string }).url,
        fileName: (fileInfo as { filename?: string }).filename,
      },
      seriesSlug
    );
    const saved = await adminFetchJson<{ data: AppearancePhotoDto }>(
      `/product-series/${seriesId}/appearance-photos`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...combo,
          main_image_A: path,
          source_product_id: sourceProductId || null,
          generated_by_ai: generated,
        }),
      }
    );
    if (!saved.ok) throw new Error(saved.error);
    const photo = unwrapSavedPhoto(saved.data) || {
      ...combo,
      main_image_A: path,
      source_product_id: sourceProductId || null,
      generated_by_ai: generated,
    };
    upsertPhoto(photo);
    setPendingPhoto(appearanceComboKey(combo), null);
  }

  async function generateOne(combo: AppearanceCombo, sourceDataUrl: string) {
    const key = appearanceComboKey(combo);
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

  async function confirmCombo(combo: AppearanceCombo) {
    const key = appearanceComboKey(combo);
    const dataUrl = pendingRef.current[key];
    if (!dataUrl) return;
    setBusyKey(key);
    setError(null);
    try {
      const file = dataUrlToFile(dataUrl, `appearance-${key.replace(/\|/g, '-')}.png`);
      await savePhoto(combo, file, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusyKey(null);
    }
  }

  async function confirmAllPending() {
    if (queueRef.current) return;
    const targets = combos.filter((combo) => pendingRef.current[appearanceComboKey(combo)]);
    if (!targets.length) return;
    queueRef.current = true;
    setError(null);
    try {
      for (const combo of targets) {
        const key = appearanceComboKey(combo);
        setBusyKey(key);
        setProgress(`Saving ${appearanceComboLabel(combo)}`);
        const dataUrl = pendingRef.current[key];
        if (!dataUrl) continue;
        const file = dataUrlToFile(dataUrl, `appearance-${key.replace(/\|/g, '-')}.png`);
        await savePhoto(combo, file, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      queueRef.current = false;
      setBusyKey(null);
      setProgress(null);
    }
  }

  function discardAllPending() {
    setPending({});
    pendingRef.current = {};
  }

  async function generateQueue(targets: AppearanceCombo[], label: string) {
    if (queueRef.current) return;
    if (combos.length < 2) return;
    const src = toPublicImagePath(sourceImageUrl);
    if (!src) {
      setError('Upload a size Main A photo first.');
      return;
    }
    if (!targets.length) return;
    queueRef.current = true;
    cancelRef.current = false;
    setError(null);
    try {
      const sourceDataUrl = await imageUrlToDataUrl(src);
      for (let i = 0; i < targets.length; i += 1) {
        if (cancelRef.current) break;
        const combo = targets[i];
        setProgress(`${label} ${i + 1} of ${targets.length}: ${appearanceComboLabel(combo)}`);
        await generateOne(combo, sourceDataUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      queueRef.current = false;
      setBusyKey(null);
      setProgress(null);
    }
  }

  function generateMissing() {
    const missing = combos.filter((combo) => {
      const key = appearanceComboKey(combo);
      return !photoForCombo(photosRef.current, combo) && !pendingRef.current[key];
    });
    return generateQueue(missing, 'Generating');
  }

  function generateAll() {
    const targets = combos.filter((combo) => !isStaffUpload(photoForCombo(photosRef.current, combo)));
    return generateQueue(targets, 'Generating');
  }

  useEffect(() => {
    if (generateTick > 0) void generateMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateTick]);

  async function uploadCombo(combo: AppearanceCombo, file: File) {
    const key = appearanceComboKey(combo);
    setBusyKey(key);
    setError(null);
    try {
      await savePhoto(combo, file, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusyKey(null);
    }
  }

  async function removeCombo(combo: AppearanceCombo, photo?: AppearancePhotoDto | null) {
    const key = appearanceComboKey(combo);
    setBusyKey(key);
    setError(null);
    const saved = await adminFetchJson(`/product-series/${seriesId}/appearance-photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photo?.id ? { id: photo.id } : combo),
    });
    setBusyKey(null);
    if (!saved.ok) {
      setError(saved.error);
      return;
    }
    setPendingPhoto(key, null);
    commitPhotos(photosRef.current.filter((row) => appearanceComboKey(row) !== key));
  }

  if ((allNa || combos.length === 0) && unused.length === 0) return null;

  const canGenerate = busyKey == null && combos.length >= 2 && Boolean(toPublicImagePath(sourceImageUrl));
  const canConfirm = busyKey == null && pendingKeys.length > 0;

  function comboStatus(combo: AppearanceCombo, photo: AppearancePhotoDto | null, pendingSrc?: string) {
    if (pendingSrc) return 'Pending confirmation';
    if (!photo?.main_image_A) return 'Missing';
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
          {progress ? (
            <Button
              helpKey="admin.product_series.appearance_cancel"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              Cancel
            </Button>
          ) : (
            <>
              {combos.length >= 2 ? (
                <>
                  <Button
                    helpKey="admin.product_series.appearance_generate_missing"
                    variant="secondary"
                    disabled={!canGenerate}
                    onClick={() => void generateMissing()}
                  >
                    Generate missing
                  </Button>
                  <Button
                    helpKey="admin.product_series.appearance_generate_all"
                    variant="secondary"
                    disabled={!canGenerate}
                    onClick={() => void generateAll()}
                  >
                    Generate all
                  </Button>
                </>
              ) : null}
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
            </>
          )}
        </div>
      </div>
      {combos.length === 1 ? (
        <p className="text-sm text-gray-500 mb-4">
          Add at least two Finish, Trim, or Reflector values to generate appearance photos. A single combination uses the
          size Main A photo.
        </p>
      ) : null}
      {combos.length >= 2 ? (
        <div className="space-y-4">
          {progress ? <p className="text-sm text-gray-600">{progress}</p> : null}
          {combos.map((combo) => {
            const key = appearanceComboKey(combo);
            const photo = photoForCombo(localPhotos, combo);
            const pendingSrc = pending[key];
            const src = pendingSrc || toPublicImagePath(photo?.main_image_A);
            const busy = busyKey === key;
            return (
              <div key={key} className="flex flex-wrap items-start gap-3 border border-gray-100 rounded p-3">
                <AdminPhotoSlot src={src} alt={appearanceComboLabel(combo)} compact />
                <div className="min-w-[12rem] flex-1">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-sm font-medium text-gray-700">{appearanceComboLabel(combo)}</span>
                    <span className="text-xs text-gray-400 shrink-0">{comboStatus(combo, photo, pendingSrc)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {pendingSrc ? (
                      <>
                        <Button
                          helpKey="admin.product_series.appearance_confirm"
                          className="text-xs py-1 px-2"
                          disabled={busyKey != null}
                          onClick={() => void confirmCombo(combo)}
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
                    <label className="btn-secondary text-xs py-1 px-2 cursor-pointer">
                      {busy && !pendingSrc ? 'Working…' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        data-help-key="admin.product_series.appearance_upload"
                        disabled={busyKey != null}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (!file) return;
                          const invalid = validateImageFile(file);
                          if (invalid) {
                            setError(invalid);
                            return;
                          }
                          void requestCrop(file, IMAGE_FRAMES.product).then((cropped) => {
                            if (cropped) void uploadCombo(combo, cropped);
                          });
                        }}
                      />
                    </label>
                    <Button
                      helpKey="admin.product_series.appearance_generate"
                      variant="secondary"
                      className="text-xs py-1 px-2"
                      disabled={busyKey != null || !toPublicImagePath(sourceImageUrl)}
                      onClick={async () => {
                        const srcUrl = toPublicImagePath(sourceImageUrl);
                        if (!srcUrl) return;
                        setError(null);
                        try {
                          const dataUrl = await imageUrlToDataUrl(srcUrl);
                          await generateOne(combo, dataUrl);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Generate failed');
                        } finally {
                          setBusyKey(null);
                        }
                      }}
                    >
                      Generate by AI
                    </Button>
                    {photo?.main_image_A ? (
                      <Button
                        helpKey="admin.product_series.appearance_remove"
                        variant="ghost"
                        className="text-xs text-red-600"
                        disabled={busyKey != null}
                        onClick={() => void removeCombo(combo, photo)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {unused.length > 0 ? (
        <div className={`${combos.length >= 2 ? 'mt-6 pt-4 border-t border-gray-100' : ''} space-y-4`}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Unused photos</h3>
            <HelpButton helpKey="admin.product_series.appearance_unused" type="button" className="text-xs text-gray-400">
              ?
            </HelpButton>
          </div>
          <p className="text-sm text-gray-500">
            These files no longer match the current Finish, Trim, or Reflector tags. They are hidden from the family
            datasheet until you remove them or restore those tags.
          </p>
          {unused.map((photo) => {
            const combo = comboFromPhoto(photo);
            const key = appearanceComboKey(photo);
            const src = toPublicImagePath(photo.main_image_A);
            return (
              <div key={photo.id || key} className="flex flex-wrap items-start gap-3 border border-gray-100 rounded p-3">
                <AdminPhotoSlot src={src} alt={appearanceComboLabel(combo)} compact />
                <div className="min-w-[12rem] flex-1">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-sm font-medium text-gray-700">{appearanceComboLabel(combo)}</span>
                    <span className="text-xs text-gray-400 shrink-0">Unused</span>
                  </div>
                  <Button
                    helpKey="admin.product_series.appearance_unused_remove"
                    variant="ghost"
                    className="text-xs text-red-600"
                    disabled={busyKey != null}
                    onClick={() => void removeCombo(combo, photo)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-600 mt-3 whitespace-pre-line">{error}</p> : null}
      {cutboard}
    </div>
  );
}

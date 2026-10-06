'use client';

import FeaturedCardImageEditor, {
  type FeaturedCardSlot,
  uploadFeaturedCardFile,
} from '@/components/admin/FeaturedCardImageEditor';
import { adminFetchJson } from '@/lib/admin-fetch';
import { extractImageSrc } from '@/lib/image-utils';

export type SeriesFeaturedPaths = {
  featured_image_source: string;
  featured_image: string;
  featured_image_page: string;
  featured_image_datasheet: string;
};

type SeriesFeaturedImageEditorProps = {
  paths: Partial<SeriesFeaturedPaths>;
  seriesSlug?: string;
  seriesId?: number;
  onChange: (next: Partial<SeriesFeaturedPaths>) => void;
  onError?: (message: string) => void;
};

export function seriesFeaturedPathsFromAttrs(attrs?: {
  featured_image?: unknown;
  featured_image_source?: unknown;
  featured_image_page?: unknown;
  featured_image_datasheet?: unknown;
} | null): Partial<SeriesFeaturedPaths> {
  return {
    featured_image_source: extractImageSrc(attrs?.featured_image_source),
    featured_image: extractImageSrc(attrs?.featured_image),
    featured_image_page: extractImageSrc(attrs?.featured_image_page),
    featured_image_datasheet: extractImageSrc(attrs?.featured_image_datasheet),
  };
}

export default function SeriesFeaturedImageEditor({
  paths,
  seriesSlug,
  seriesId,
  onChange,
  onError,
}: SeriesFeaturedImageEditorProps) {
  async function persist(file: File, slot: FeaturedCardSlot): Promise<void> {
    const field = slot === 'source' ? 'featured_image_page' : 'featured_image';
    const path = await uploadFeaturedCardFile(file, seriesSlug);
    onChange({ [field]: path });
    if (seriesId) {
      const saved = await adminFetchJson(`/product-series/${seriesId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: path }),
      });
      if (!saved.ok) throw new Error(saved.error);
    }
  }

  async function clear(slot: FeaturedCardSlot): Promise<void> {
    const field = slot === 'source' ? 'featured_image_page' : 'featured_image';
    onChange({ [field]: '' });
    if (seriesId) {
      const saved = await adminFetchJson(`/product-series/${seriesId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: null }),
      });
      if (!saved.ok) throw new Error(saved.error);
    }
  }

  return (
    <FeaturedCardImageEditor
      sourceSrc={paths.featured_image_page}
      cardSrc={paths.featured_image}
      persist={persist}
      clear={clear}
      onError={onError}
      copy={{
        sourceTitle: 'Series photo',
        sourceHint:
          'Shown on the series page and on datasheets. Keeps this file’s own shape. Click the photo to edit it with AI.',
        cardTitle: 'Card photo',
        cardHint:
          '16:9 image on the homepage and on category cards such as Downlights. Click the photo to edit it with AI.',
        cardEmpty: '16:9 card. Extend the series photo left and right to fill this frame.',
        alreadyWide: 'Extend only adds background on the left and right. This photo is already wider than 16:9.',
        alreadyRatio: 'This series photo is already 16:9, so the card does not need a wider background.',
        adjustTitle: 'Adjust series photo',
      }}
      help={{
        source: 'admin.product_series.series_photo',
        adjust: 'admin.product_series.series_photo_adjust',
        extend: 'admin.product_series.card_extend',
        deleteSlot: 'admin.product_series.featured_delete',
        ai: 'admin.product_series.photo_enhance',
      }}
    />
  );
}

'use client';

import FeaturedCardImageEditor, {
  type FeaturedCardSlot,
  uploadFeaturedCardFile,
} from '@/components/admin/FeaturedCardImageEditor';
import { adminFetchJson } from '@/lib/admin-fetch';
import { extractImageSrc } from '@/lib/image-utils';

export type TypeFeaturedPaths = {
  featured_image_source: string;
  featured_image: string;
};

type TypeFeaturedImageEditorProps = {
  paths: Partial<TypeFeaturedPaths>;
  typeSlug?: string;
  typeId?: number;
  onChange: (next: Partial<TypeFeaturedPaths>) => void;
  onError?: (message: string) => void;
};

export function typeFeaturedPathsFromAttrs(attrs?: {
  featured_image?: unknown;
  featured_image_source?: unknown;
} | null): Partial<TypeFeaturedPaths> {
  return {
    featured_image_source: extractImageSrc(attrs?.featured_image_source),
    featured_image: extractImageSrc(attrs?.featured_image),
  };
}

export default function TypeFeaturedImageEditor({
  paths,
  typeSlug,
  typeId,
  onChange,
  onError,
}: TypeFeaturedImageEditorProps) {
  async function persist(file: File, slot: FeaturedCardSlot): Promise<void> {
    const field = slot === 'source' ? 'featured_image_source' : 'featured_image';
    const path = await uploadFeaturedCardFile(file, typeSlug);
    onChange({ [field]: path });
    if (typeId) {
      const saved = await adminFetchJson(`/product-types/${typeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: path }),
      });
      if (!saved.ok) throw new Error(saved.error);
    }
  }

  async function clear(slot: FeaturedCardSlot): Promise<void> {
    const field = slot === 'source' ? 'featured_image_source' : 'featured_image';
    onChange({ [field]: '' });
    if (typeId) {
      const saved = await adminFetchJson(`/product-types/${typeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: null }),
      });
      if (!saved.ok) throw new Error(saved.error);
    }
  }

  return (
    <FeaturedCardImageEditor
      sourceSrc={paths.featured_image_source}
      cardSrc={paths.featured_image}
      persist={persist}
      clear={clear}
      onError={onError}
      copy={{
        sourceTitle: 'Type photo',
        sourceHint:
          'Original photo for this category. Keeps this file’s own shape. Click the photo to edit it with AI.',
        cardTitle: 'Card photo',
        cardHint: '16:9 image on /products. Click the photo to edit it with AI.',
        cardEmpty: '16:9 card. Extend the type photo left and right to fill this frame.',
        alreadyWide: 'Extend only adds background on the left and right. This photo is already wider than 16:9.',
        alreadyRatio: 'This type photo is already 16:9, so the card does not need a wider background.',
        adjustTitle: 'Adjust type photo',
      }}
      help={{
        source: 'admin.product_types.type_photo',
        adjust: 'admin.product_types.type_photo_adjust',
        extend: 'admin.product_types.card_extend',
        deleteSlot: 'admin.product_types.featured_delete',
        ai: 'admin.product_series.photo_enhance',
      }}
    />
  );
}

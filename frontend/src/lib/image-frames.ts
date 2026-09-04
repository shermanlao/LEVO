/**
 * Canonical placeholder frames for public cards and the matching admin crop board.
 * Uploaders crop to these ratios so the stored file fills the same box everywhere.
 */
export type ImageFrameKey =
  | 'catalog'
  | 'seriesPage'
  | 'product'
  | 'project'
  | 'projectSection'
  | 'hero'
  | 'og'
  | 'logo'
  | 'icon'
  | 'label';

export type ImageFrame = {
  key: ImageFrameKey;
  /** width / height */
  ratio: number;
  className: string;
  label: string;
  mime: 'image/jpeg' | 'image/png';
  maxEdge: number;
};

export const IMAGE_FRAMES: Record<ImageFrameKey, ImageFrame> = {
  catalog: {
    key: 'catalog',
    ratio: 16 / 9,
    className: 'aspect-video',
    label: '16:9',
    mime: 'image/jpeg',
    maxEdge: 1600,
  },
  seriesPage: {
    key: 'seriesPage',
    ratio: 4 / 5,
    className: 'aspect-[4/5]',
    label: '4:5',
    mime: 'image/jpeg',
    maxEdge: 1600,
  },
  product: {
    key: 'product',
    ratio: 1,
    className: 'aspect-square',
    label: '1:1',
    mime: 'image/jpeg',
    maxEdge: 1600,
  },
  project: {
    key: 'project',
    ratio: 16 / 9,
    className: 'aspect-video',
    label: '16:9',
    mime: 'image/jpeg',
    maxEdge: 1600,
  },
  projectSection: {
    key: 'projectSection',
    ratio: 3 / 2,
    className: 'aspect-[3/2]',
    label: '3:2',
    mime: 'image/jpeg',
    maxEdge: 1600,
  },
  hero: {
    key: 'hero',
    ratio: 3 / 2,
    className: 'aspect-[3/2]',
    label: '3:2',
    mime: 'image/jpeg',
    maxEdge: 1800,
  },
  og: {
    key: 'og',
    ratio: 1200 / 630,
    className: 'aspect-[1200/630]',
    label: '1.91:1',
    mime: 'image/jpeg',
    maxEdge: 1200,
  },
  logo: {
    key: 'logo',
    ratio: 3 / 1,
    className: 'aspect-[3/1]',
    label: '3:1',
    mime: 'image/png',
    maxEdge: 1200,
  },
  icon: {
    key: 'icon',
    ratio: 1,
    className: 'aspect-square',
    label: '1:1',
    mime: 'image/png',
    maxEdge: 512,
  },
  label: {
    key: 'label',
    ratio: 1,
    className: 'aspect-square',
    label: '1:1',
    mime: 'image/png',
    maxEdge: 256,
  },
};

export const SITE_SLOT_FRAMES: Record<'header' | 'pdf' | 'icon' | 'hero' | 'og', ImageFrame> = {
  header: IMAGE_FRAMES.logo,
  pdf: IMAGE_FRAMES.logo,
  icon: IMAGE_FRAMES.icon,
  hero: IMAGE_FRAMES.hero,
  og: IMAGE_FRAMES.og,
};

export type SeriesFeaturedSlot = 'catalog' | 'page' | 'datasheet';

export const SERIES_FEATURED_SLOTS: Array<{
  slot: SeriesFeaturedSlot;
  field: 'featured_image' | 'featured_image_page' | 'featured_image_datasheet';
  frame: ImageFrame;
  title: string;
  hint: string;
  helpKey: string;
}> = [
  {
    slot: 'catalog',
    field: 'featured_image',
    frame: IMAGE_FRAMES.catalog,
    title: 'Catalog card',
    hint: '16:9 card on category pages such as Downlights.',
    helpKey: 'admin.product_series.featured_catalog',
  },
  {
    slot: 'page',
    field: 'featured_image_page',
    frame: IMAGE_FRAMES.seriesPage,
    title: 'Series page',
    hint: '4:5 gallery photo on the series page.',
    helpKey: 'admin.product_series.featured_page',
  },
  {
    slot: 'datasheet',
    field: 'featured_image_datasheet',
    frame: IMAGE_FRAMES.product,
    title: 'Family datasheet',
    hint: '1:1 square on the family datasheet and option-list thumbs.',
    helpKey: 'admin.product_series.featured_datasheet',
  },
];

export function projectUploadFrame(imageType: string): ImageFrame {
  return imageType === 'thumbnail' ? IMAGE_FRAMES.project : IMAGE_FRAMES.projectSection;
}

export function validateImageFile(file: File, maxBytes = 5 * 1024 * 1024): string | null {
  if (!file.type.startsWith('image/')) return 'Please select an image file';
  if (file.size > maxBytes) return 'File size must be less than 5MB';
  return null;
}

export function assignFileToInput(input: HTMLInputElement | null, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  if (input) input.files = transfer.files;
}

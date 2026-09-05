import { API_CONFIG } from './api-config';
import { devLog } from './dev-log';

/** Unwrap a string URL from Strapi-like `{ data: { attributes: { url } } }` or a plain string. */
export function extractImageSrc(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return extractImageSrc(value[0]);
  if (typeof value === 'object') {
    const v = value as {
      data?: { attributes?: { url?: string }; url?: string } | null;
      attributes?: { url?: string };
      url?: string;
    };
    if (v.data === null) return '';
    const nested = v.data?.attributes?.url || v.data?.url || v.attributes?.url || v.url;
    return typeof nested === 'string' ? nested : '';
  }
  return '';
}

/** Same-origin proxy for a remote partner photo — never persist this path to SQLite. */
export function isProductMediaProxyPath(src: string): boolean {
  return src.startsWith('/api/product-media/');
}

/**
 * Value to PUT on a product image STRING column.
 * `undefined` means omit the field (proxy display URL; keep the stored remote URL).
 */
export function toPersistedImageValue(value: unknown): string | null | undefined {
  const src = extractImageSrc(value);
  if (src && isProductMediaProxyPath(src)) return undefined;
  if (src.startsWith('blob:')) return undefined;
  return src || null;
}

/**
 * Turn a product image field (string or Strapi media object) into a same-origin path.
 * Does not prepend `/images/` onto `/api/product-media/...` proxy URLs.
 */
export function toPublicImagePath(value: unknown): string {
  const src = extractImageSrc(value);
  if (!src) return '';
  if (
    src.startsWith('http') ||
    src.startsWith('/api/') ||
    src.startsWith('/images/') ||
    src.startsWith('/uploads/')
  ) {
    return src;
  }
  if (src.includes('/images/')) {
    return src.replace(/^\/+/, '/');
  }
  return `/images/${src.replace(/^\/+/, '')}`;
}

/** Staff `/uploads` files and blob previews must skip Next image optimization. */
export function shouldSkipImageOptimize(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:');
}

export type ProductGalleryImage = {
  id: string;
  url: string;
  alt: string;
};

const GALLERY_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'main_image_A', label: 'Main view' },
  { key: 'main_image_B', label: 'Alternate view' },
  { key: 'size_image', label: 'Dimensions' },
  { key: 'application_image', label: 'Application' },
  { key: 'photometric_image', label: 'Photometric' },
];

/**
 * Collect gallery URLs from already-loaded product JSON.
 * Does not HEAD-check files — partner `/api/product-media/...` paths are treated as valid.
 */
export function collectProductGalleryImages(product: {
  attributes?: Record<string, unknown> & {
    name?: string;
    images?: { data?: Array<{ attributes?: { url?: string } }> };
  };
} | null | undefined): ProductGalleryImage[] {
  const attrs = product?.attributes;
  if (!attrs) return [];

  const name = attrs.name || 'Product';
  const images: ProductGalleryImage[] = [];
  const seen = new Set<string>();

  const add = (id: string, value: unknown, label: string) => {
    const url = toPublicImagePath(value);
    if (!url || seen.has(url)) return;
    seen.add(url);
    images.push({ id, url, alt: `${name} - ${label}` });
  };

  const nested = attrs.images?.data;
  if (Array.isArray(nested)) {
    nested.forEach((img, index) => {
      add(`img_${index}`, img?.attributes?.url, `Image ${index + 1}`);
    });
  }

  for (const field of GALLERY_FIELDS) {
    add(field.key, attrs[field.key], field.label);
  }

  if (!images.some((img) => img.id === 'main_image_A')) {
    add('featured_image', attrs.featured_image, 'Featured');
  }

  return images;
}

export type SeriesFeaturedAttrs = {
  featured_image?: unknown;
  featured_image_source?: unknown;
  featured_image_page?: unknown;
  featured_image_datasheet?: unknown;
};

export function seriesFeaturedCatalogUrl(attrs?: SeriesFeaturedAttrs | null): string {
  return toPublicImagePath(attrs?.featured_image);
}

export function seriesFeaturedSourceUrl(attrs?: SeriesFeaturedAttrs | null): string {
  return toPublicImagePath(attrs?.featured_image_source) || seriesFeaturedCatalogUrl(attrs);
}

export function seriesFeaturedPageUrl(attrs?: SeriesFeaturedAttrs | null): string {
  return (
    toPublicImagePath(attrs?.featured_image_page) ||
    toPublicImagePath(attrs?.featured_image_source) ||
    seriesFeaturedCatalogUrl(attrs)
  );
}

export function seriesFeaturedDatasheetUrl(attrs?: SeriesFeaturedAttrs | null): string {
  return (
    toPublicImagePath(attrs?.featured_image_datasheet) ||
    toPublicImagePath(attrs?.featured_image_source) ||
    seriesFeaturedCatalogUrl(attrs)
  );
}

/** Main catalog photo for a product list/card row. */
export function productImageUrl(product: {
  attributes?: { main_image_A?: unknown; featured_image?: unknown };
} | null | undefined): string {
  const attrs = product?.attributes;
  if (!attrs) return '';
  return toPublicImagePath(attrs.main_image_A) || toPublicImagePath(attrs.featured_image) || '';
}

/**
 * Photo shown on a series page: admin series featured image, otherwise the first product photo.
 */
export function resolveSeriesImageUrl(
  featuredImage: unknown,
  products?: Array<{ attributes?: { main_image_A?: unknown; featured_image?: unknown } }>
): string {
  const fromSeries = toPublicImagePath(featuredImage);
  if (fromSeries) return fromSeries;
  if (!Array.isArray(products)) return '';
  for (const product of products) {
    const url = productImageUrl(product);
    if (url) return url;
  }
  return '';
}

/** Unique series + product photos for the series-page gallery. */
export function uniqueSeriesPhotoUrls(
  featuredImage: unknown,
  products?: Array<{ attributes?: { name?: string; main_image_A?: unknown; featured_image?: unknown } }>
): { url: string; alt: string }[] {
  const photos: { url: string; alt: string }[] = [];
  const seen = new Set<string>();
  const add = (value: unknown, alt: string) => {
    const url = toPublicImagePath(value);
    if (!url || seen.has(url)) return;
    seen.add(url);
    photos.push({ url, alt });
  };
  add(featuredImage, 'Series');
  if (Array.isArray(products)) {
    for (const product of products) {
      const name = product?.attributes?.name || 'Product';
      add(product?.attributes?.main_image_A, name);
    }
  }
  return photos;
}

/** Same left-column images as the generated datasheet: product photo, size drawing, photometric. */
export function datasheetGalleryUrls(input: {
  main?: unknown;
  size?: unknown;
  photometric?: unknown;
  fallbackMain?: unknown;
  polarUrl?: string;
}): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    const url = typeof value === 'string' && value.startsWith('/api/series/')
      ? value
      : toPublicImagePath(value);
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };
  add(input.main);
  if (urls.length === 0) add(input.fallbackMain);
  add(input.size);
  if (input.polarUrl) add(input.polarUrl);
  else add(input.photometric);
  return urls;
}

function withCacheBuster(url: string, cacheKey?: number | string): string {
  if (cacheKey == null || cacheKey === '') return url;
  return `${url}${url.includes('?') ? '&' : '?'}t=${cacheKey}`;
}

/** Public folder under `/images/products/` — series slug, or `general` when the product has no series. */
export function productImageFolder(seriesSlug?: string | null): string {
  const slug = typeof seriesSlug === 'string' ? seriesSlug.trim() : '';
  return slug || 'general';
}

/**
 * Persistable <img> path from an upload API result.
 * Always keep the folder in the database so admin preview does not guess eco-pro vs general.
 */
export function storedProductImagePath(
  uploadResult:
    | { filePath?: string; url?: string; fileName?: string; name?: string }
    | null
    | undefined,
  seriesSlug?: string | null
): string {
  const full = uploadResult?.filePath || uploadResult?.url || '';
  if (
    full.startsWith('/images/') ||
    full.startsWith('/uploads/') ||
    full.startsWith('/api/')
  ) {
    return full.split('?')[0];
  }
  const raw = uploadResult?.fileName || uploadResult?.name || full;
  if (!raw) return '';
  if (raw.startsWith('/')) return raw.split('?')[0];
  const fileName = raw.includes('/') ? raw.substring(raw.lastIndexOf('/') + 1) : raw;
  return `/images/products/${productImageFolder(seriesSlug)}/${fileName}`;
}

function hasFileExtension(path: string): boolean {
  return /\.[a-z0-9]+$/i.test(path.split('?')[0]);
}

/**
 * Build an <img> src for a product field.
 * Partner proxy paths (`/api/product-media/...`) must not get a fake `.jpg` suffix —
 * that turns `main_image_A` into the invalid field `main_image_A.jpg`.
 */
export function resolveProductDisplaySrc(
  value: unknown,
  options?: { seriesSlug?: string; cacheKey?: number | string }
): string {
  const src = extractImageSrc(value);
  if (!src) return '';
  if (src.startsWith('blob:')) return src;

  if (src.startsWith('/api/') || /^https?:\/\//i.test(src)) {
    return withCacheBuster(src, options?.cacheKey);
  }

  if (src.startsWith('/')) {
    const normalized = src.replace(/^\/images\/images\//, '/images/');
    const withExt = hasFileExtension(normalized) ? normalized : `${normalized}.jpg`;
    return withCacheBuster(withExt, options?.cacheKey);
  }

  const folder = options?.seriesSlug || 'general';
  const filename = hasFileExtension(src) ? src : `${src}.jpg`;
  return withCacheBuster(`/images/products/${folder}/${filename}`, options?.cacheKey);
}

/**
 * Resolves an image URL to the correct path based on its source
 * 
 * @param url - The original image URL from the API or database
 * @param defaultImage - Optional default image to use if URL is empty
 * @returns The resolved image URL
 */
export function resolveImageUrl(url: unknown, defaultImage: string = '/images/placeholder.jpg'): string {
  // Add debug logging
  const extracted = extractImageSrc(url);
  devLog('resolveImageUrl input:', url);
  
  // If URL is empty or null, return default image
  if (!extracted) {
    devLog('resolveImageUrl: Empty URL, returning default:', defaultImage);
    return defaultImage;
  }
  let urlStr = extracted;
  
  // Check if this is a featured image request and map it to a main image if needed
  const mappedUrl = mapFeaturedImageToMainImage(urlStr);
  if (mappedUrl !== urlStr) {
    devLog('resolveImageUrl: Mapped featured image to:', mappedUrl);
    urlStr = mappedUrl || urlStr;
  }
  
  // Handle direct localhost URLs with missing file extension
  if (urlStr.startsWith('http://localhost') && !urlStr.includes('.')) {
    devLog('resolveImageUrl: Adding .jpg extension to localhost URL');
    return `${urlStr}.jpg`;
  }
  
  // Handle case sensitivity issues for image extensions - attempt both JPG and jpg
  if (urlStr.toLowerCase().endsWith('.jpg') && !urlStr.endsWith('.JPG') && !urlStr.endsWith('.jpg')) {
    const jpgVersion = urlStr.substring(0, urlStr.length - 4) + '.jpg';
    const JPGVersion = urlStr.substring(0, urlStr.length - 4) + '.JPG';
    
    devLog('resolveImageUrl: Handling potential case sensitivity issues with extensions');
    devLog('Will try both: ', jpgVersion, ' and ', JPGVersion);
    urlStr = JPGVersion;
  }
  
  if (urlStr.startsWith('/images/') || urlStr.startsWith('/api/')) {
    devLog('resolveImageUrl: URL is a public/proxy path, returning as is');
    return urlStr;
  }
  
  if (urlStr.startsWith('images/')) {
    const result = `/${urlStr}`;
    devLog('resolveImageUrl: Adding leading slash to URL:', result);
    return result;
  }
  
  if (!urlStr.includes('/') && (urlStr.toLowerCase().endsWith('.jpg') || urlStr.toLowerCase().endsWith('.png') || urlStr.toLowerCase().endsWith('.jpeg') || urlStr.toLowerCase().endsWith('.svg'))) {
    const result = `/images/products/general/${urlStr}`;
    devLog('resolveImageUrl: Converting filename to path:', result);
    return result;
  }
  
  if (urlStr.startsWith('http')) {
    try {
      const host = new URL(urlStr).hostname.toLowerCase();
      if (host === 'lightx.synology.me' || host.endsWith('.synology.me')) {
        console.warn('resolveImageUrl: blocked partner host; use /api/product-media instead');
        return defaultImage;
      }
    } catch {
      /* keep url */
    }
    devLog('resolveImageUrl: URL is absolute, returning as is');
    return urlStr;
  }
  
  const { cmsUrl } = API_CONFIG.getApiUrls();
  
  if (urlStr.startsWith('/uploads/')) {
    const cmsResult = `${cmsUrl}${urlStr}`;
    devLog('resolveImageUrl: URL is from CMS uploads, returning:', cmsResult);
    return cmsResult;
  }
  
  if (urlStr.includes('uploads/')) {
    const normalizedUrl = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
    const cmsResult = `${cmsUrl}${normalizedUrl}`;
    devLog('resolveImageUrl: URL contains uploads path, returning with CMS URL:', cmsResult);
    return cmsResult;
  }
  
  if (!urlStr.startsWith('/')) {
    const result = `${cmsUrl}/${urlStr}`;
    devLog('resolveImageUrl: URL is from CMS without leading slash, returning:', result);
    return result;
  }
  
  const result = `${cmsUrl}${urlStr}`;
  devLog('resolveImageUrl: URL is from CMS with leading slash, returning:', result);
  return result;
}

/**
 * Checks if an image exists at the given URL
 * 
 * @param url - The image URL to check
 * @returns Promise that resolves to true if the image exists, false otherwise
 */
export async function checkImageExists(url: string): Promise<boolean> {
  // If URL is a local path, assume it exists
  if (url.startsWith('/')) return true;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking if image exists:', error);
    return false;
  }
}

// Add a function to normalize directory names
export function normalizeDirectoryName(dirName: string): string {
  // Map of incorrect directory names to correct ones
  const directoryMap: Record<string, string> = {
    'ecopro': 'eco-pro',
    'luxbeam': 'lux-beam',
    'slimline': 'slim-line',
    'protrack': 'pro-track',
    'flexbeam': 'flex-beam'
  };

  return directoryMap[dirName] || dirName;
}

// Add a mapping function to handle featured image requests
export function mapFeaturedImageToMainImage(url: string | undefined | null): string | null {
  if (!url) return null;
  
  devLog('mapFeaturedImageToMainImage input:', url);
  
  // Check if this is a featured image request
  const featuredPattern = /\/products\/([^\/]+)\/(\d+)-featured\.(jpg|JPG)/i;
  const match = url.match(featuredPattern);
  
  if (match) {
    const seriesSlug = match[1]; // e.g., 'slim-line'
    const productId = match[2];  // e.g., '5'
    const extension = match[3];  // jpg or JPG
    
    // Normalize directory name
    const normalizedSeriesSlug = normalizeDirectoryName(seriesSlug);
    
    // Create alternative paths to try
    const alternativePaths = [
      `/images/products/${normalizedSeriesSlug}/${productId}-main-a.JPG`,
      `/images/products/${normalizedSeriesSlug}/${productId}-main-a.jpg`,
      `/images/products/${normalizedSeriesSlug}/${productId}-main_image_A.JPG`,
      `/images/products/${normalizedSeriesSlug}/${productId}-main_image_A.jpg`,
      `/images/products/${normalizedSeriesSlug}/${productId}-main.JPG`,
      `/images/products/${normalizedSeriesSlug}/${productId}-main.jpg`
    ];
    
    devLog(`Featured image requested for product ${productId}, redirecting to main image in ${normalizedSeriesSlug}`);
    
    // Return the first alternative path - the image loading component will try others if this fails
    return alternativePaths[0];
  }
  
  // Also handle direct main image requests with incorrect directory names
  const mainImagePattern = /\/products\/([^\/]+)\/(\d+)-main-a\.(jpg|JPG)/i;
  const mainMatch = url.match(mainImagePattern);
  
  if (mainMatch) {
    const seriesSlug = mainMatch[1]; // e.g., 'slimline'
    const productId = mainMatch[2];  // e.g., '5'
    const extension = mainMatch[3];  // jpg or JPG
    
    // Normalize directory name if needed
    const normalizedSeriesSlug = normalizeDirectoryName(seriesSlug);
    
    // If the normalized name is different, update the path
    if (normalizedSeriesSlug !== seriesSlug) {
      devLog(`Correcting directory name from ${seriesSlug} to ${normalizedSeriesSlug}`);
      return `/images/products/${normalizedSeriesSlug}/${productId}-main-a.${extension}`;
    }
  }
  
  // If it's not a featured image request, return the original URL
  return url;
} 
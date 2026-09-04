import { cache } from 'react';
import { normalizeStrapiEnvelope } from './strapi-entity';
import { CATALOG_REVALIDATE_SECONDS, tagsForEndpoint } from './catalog-cache';
import { getBackendBaseUrl, expressBaseCandidates } from './api-config';
import { devLog } from './dev-log';

export { getBackendBaseUrl };

function getBackendBaseUrlCandidates(): string[] {
  return expressBaseCandidates(getBackendBaseUrl());
}

let ACTIVE_API_URL = getBackendBaseUrl();
devLog('API URL set to:', ACTIVE_API_URL);

/**
 * Reload the API and clear all caches
 * Call this after adding or updating products
 */
export async function reloadAPI(): Promise<boolean> {
  devLog('Reloading API and clearing caches...');
  
  const urls = [
    ...new Set(
      [...getBackendBaseUrlCandidates(), ACTIVE_API_URL].map((base) => `${base.replace(/\/$/, '')}/api/reload`)
    ),
  ];
  
  // Remove duplicates
  const uniqueUrls = Array.from(new Set(urls));
  
  // Try each URL until one works
  for (const url of uniqueUrls) {
    try {
      devLog(`Trying API reload at: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store' as RequestCache,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        try {
          const data = await response.json();
          devLog('API reload successful:', data.message || 'Cache cleared');
          return true;
        } catch (parseError) {
          devLog('API reload likely successful (response OK but invalid JSON)');
          return true;
        }
      } else {
        console.warn(`API reload at ${url} failed:`, response.status, response.statusText);
      }
    } catch (error) {
      console.warn(`Error connecting to ${url}:`, error instanceof Error ? error.message : String(error));
      // Continue to next URL
    }
  }
  
  // All attempts failed, use built-in cache busting as fallback
  console.warn('All API reload attempts failed, using cache busting as fallback');
  
  try {
    // Legacy approach: fetch a random endpoint to force browser cache refresh
    const cacheBuster = Date.now();
    await fetch(`${ACTIVE_API_URL}/api/health?_=${cacheBuster}`, {
      method: 'GET',
      cache: 'no-store' as RequestCache,
    });
    return true;
  } catch (error) {
    console.error('Even fallback cache busting failed:', error);
    return false;
  }
}

type FetchApiOptions = RequestInit & {
  allowNotFound?: boolean;
  cacheMode?: 'public' | 'no-store';
};

/**
 * Generic fetch function for the SQLite backend API.
 * Public catalog reads use a 120s tagged cache; pass cacheMode: 'no-store' for admin.
 */
async function fetchAPI<T>(
  endpoint: string,
  options: FetchApiOptions = {},
  refreshCache: boolean = false
): Promise<T> {
  devLog(`fetchAPI called for: ${endpoint}, refreshCache: ${refreshCache}`);
  const { allowNotFound, cacheMode: cacheModeOpt, ...requestOptions } = options;

  if (refreshCache) {
    await reloadAPI();
  }

  const cacheMode: 'public' | 'no-store' =
    refreshCache || cacheModeOpt === 'no-store' ? 'no-store' : 'public';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const cacheInit =
    cacheMode === 'no-store'
      ? { cache: 'no-store' as RequestCache }
      : { next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: tagsForEndpoint(endpoint) } };

  const isPriority =
    endpoint.includes('admin') ||
    endpoint.includes('product-series') ||
    endpoint.includes('featured');
  const timeoutMs = isPriority ? 12000 : 5000;

  const bases = getBackendBaseUrlCandidates();
  let lastError: unknown;

  for (let baseIndex = 0; baseIndex < bases.length; baseIndex++) {
    const base = bases[baseIndex].replace(/\/$/, '');
    const url = endpoint.startsWith('/api') ? `${base}${endpoint}` : `${base}/api${endpoint}`;

    devLog(`Fetching from: ${url} with ${timeoutMs}ms timeout`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        devLog(`Request timeout after ${timeoutMs}ms for: ${url}`);
        controller.abort();
      }, timeoutMs);

      const mergedSignal = requestOptions.signal || controller.signal;
      const response = await fetch(url, {
        headers,
        ...cacheInit,
        signal: mergedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (allowNotFound && response.status === 404) {
          return { data: null } as T;
        }
        console.error(`API error response:`, response.status, response.statusText);
        throw new Error(`API error: ${response.status} ${response.statusText || 'Unknown Error'}`);
      }

      const data = await response.json();
      ACTIVE_API_URL = base;

      const isCatalog =
        endpoint.includes('product-types') ||
        endpoint.includes('product-series') ||
        (endpoint.includes('products') && !endpoint.includes('product-media'));
      return (isCatalog ? normalizeStrapiEnvelope(data) : data) as T;
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const isNetwork =
        error instanceof TypeError ||
        (error instanceof Error && (msg === 'fetch failed' || msg.toLowerCase().includes('abort')));

      if (isNetwork && baseIndex < bases.length - 1) {
        console.warn(`fetchAPI: ${msg} for ${url}; retrying alternate host…`);
        continue;
      }

      console.error(`Error connecting to ${url}:`, msg);
      throw new Error(`API connection failed: ${msg}`);
    }
  }

  const finalMsg = lastError instanceof Error ? lastError.message : 'Unknown error';
  throw new Error(`API connection failed: ${finalMsg}`);
}

export type WhyCard = {
  title: string;
  body: string;
  icon: 'energy' | 'lifespan' | 'design';
};

export type SiteContact = {
  heading: string;
  intro: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
  website?: string;
  datasheet_disclaimer?: string;
  slogan?: string;
  company_name?: string;
  company_short_name?: string;
  logo_header?: string;
  logo_pdf?: string;
  logo_icon?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_label?: string;
  hero_cta_href?: string;
  hero_image?: string;
  featured_heading?: string;
  featured_projects_heading?: string;
  why_heading?: string;
  why_cards?: WhyCard[];
  social_linkedin?: string;
  social_instagram?: string;
  social_facebook?: string;
  social_threads?: string;
  social_pinterest?: string;
  resource_warranty_title?: string;
  resource_warranty_body?: string;
  resource_certifications_title?: string;
  resource_certifications_body?: string;
  resource_technical_title?: string;
  resource_technical_body?: string;
  seo_title?: string;
  seo_description?: string;
  og_image?: string;
};

export const getSiteContact = cache(async function getSiteContact(): Promise<SiteContact> {
  const result = await fetchAPI<{ data: SiteContact }>('/contact');
  if (!result?.data) {
    throw new Error('Contact details not found');
  }
  return result.data;
});

type ApiProjectRow = Record<string, any>;

function normalizeProjectRow(row: ApiProjectRow | null | undefined): ApiProjectRow | null {
  if (!row) return null;
  const p = row.data && !row.slug && !row.id ? row.data : row;
  const name = p.name || p.title || '';
  const sections = Array.isArray(p.sections)
    ? p.sections.map((section: ApiProjectRow) => ({
        ...section,
        images: Array.isArray(section.images)
          ? section.images.map((img: unknown) =>
              typeof img === 'string' ? img : String((img as ApiProjectRow)?.image_path || '')
            ).filter(Boolean)
          : [],
      }))
    : [];
  return {
    ...p,
    name,
    title: p.title || name,
    sections,
    paragraphs: Array.isArray(p.paragraphs) ? p.paragraphs : [],
  };
}

export async function getProjectBySlugFromApi(slug: string): Promise<ApiProjectRow | null> {
  try {
    const result = await fetchAPI<{ success?: boolean; data?: ApiProjectRow }>(
      `/projects/slug/${encodeURIComponent(slug)}`,
      { allowNotFound: true }
    );
    if (!result?.data) return null;
    return normalizeProjectRow(result.data);
  } catch {
    return null;
  }
}

export async function getProjectByIdFromApi(id: string): Promise<ApiProjectRow | null> {
  try {
    const result = await fetchAPI<{ success?: boolean; data?: ApiProjectRow }>(
      `/projects/id/${encodeURIComponent(id)}`,
      { allowNotFound: true }
    );
    if (!result?.data) return null;
    return normalizeProjectRow(result.data);
  } catch {
    return null;
  }
}

export async function getProjectsFromApi(): Promise<ApiProjectRow[]> {
  try {
    const result = await fetchAPI<{ success?: boolean; data?: ApiProjectRow[] }>('/projects');
    const list = Array.isArray(result?.data) ? result.data : [];
    return list.map((row) => normalizeProjectRow(row)).filter(Boolean) as ApiProjectRow[];
  } catch {
    return [];
  }
}

export async function getFeaturedProjects(): Promise<ApiProjectRow[]> {
  try {
    const result = await fetchAPI<{ success?: boolean; data?: ApiProjectRow[] }>('/projects/featured');
    const list = Array.isArray(result?.data) ? result.data : [];
    return list.map((row) => normalizeProjectRow(row)).filter(Boolean) as ApiProjectRow[];
  } catch {
    return [];
  }
}

/**
 * Get all product types
 */
export async function getProductTypes(params: Record<string, string> = {}): Promise<any> {
  devLog('getProductTypes - Starting fetch');
  
  // Always add populate parameter to get featured images
  const apiParams = {
    ...params,
    populate: 'featured_image'  // This tells the API to include image data
  };
  
  const queryString = new URLSearchParams(apiParams).toString();
  const endpoint = queryString ? `/product-types?${queryString}` : '/product-types?populate=featured_image';
  
  devLog('getProductTypes - Using endpoint:', endpoint);
  
  try {
    // Using fetchAPI (with retry/fallback logic built in)
    return await fetchAPI(endpoint);
  } catch (error) {
    console.error('getProductTypes - Fetch attempt failed:', error);
    throw error;
  }
}

/**
 * Get a specific product type by slug
 */
export const getProductType = cache(async function getProductType(slug: string): Promise<any> {
  try {
    devLog('getProductType - Fetching product type with slug:', slug);
    return await fetchAPI(`/product-types/by-slug/${slug}`);
  } catch (error) {
    console.error('getProductType - Fetch failed:', error);
    throw error;
  }
});

/**
 * Get all product series
 */
export async function getProductSeries(params: Record<string, string> = {}): Promise<any> {
  devLog('getProductSeries - Starting fetch with params:', params);
  
  try {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString ? `/product-series?${queryString}` : '/product-series';
  
    devLog('getProductSeries - Using endpoint:', endpoint);
    
    // Add longer timeout for admin pages
    const signal = AbortSignal.timeout(10000); // 10 seconds timeout
    
    return await fetchAPI(endpoint, { signal });
  } catch (error) {
    console.error('getProductSeries - Fetch failed:', error);
    throw error;
  }
}

/**
 * Get a specific product series by slug
 */
export const getProductSeriesBySlug = cache(async function getProductSeriesBySlug(slug: string): Promise<any> {
  return await fetchAPI(`/product-series/by-slug/${encodeURIComponent(slug)}`, {
    signal: AbortSignal.timeout(8000),
    allowNotFound: true,
  });
});

function productSeriesSlug(product: { attributes?: Record<string, any> }): string {
  const attrs = product?.attributes || {};
  return (
    attrs.path?.series_slug ||
    attrs.series?.data?.attributes?.slug ||
    ''
  );
}

/**
 * Products that belong to a series (by slug).
 * Uses GET /products?series=:slug, then filters again in case the API ignored the query.
 */
export async function getProductsBySeriesSlug(seriesSlug: string): Promise<any[]> {
  if (!seriesSlug) return [];
  try {
    const result = await getProducts({ series: seriesSlug });
    const list = Array.isArray(result?.data) ? result.data : [];
    return list.filter((product: { attributes?: Record<string, any> }) => {
      return productSeriesSlug(product) === seriesSlug;
    });
  } catch (error) {
    console.error(`getProductsBySeriesSlug - Fetch failed for ${seriesSlug}:`, error);
    return [];
  }
}

/**
 * Get all products with optional filtering
 */
export async function getProducts(params: Record<string, string> = {}, refreshCache: boolean = false): Promise<any> {
  try {
    devLog('getProducts - Starting fetch with params:', params, 'refreshCache:', refreshCache);
    
  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString ? `/products?${queryString}` : '/products';
  
    // If refreshCache is requested, try to reload API but don't fail if it doesn't work
    if (refreshCache) {
      try {
        const reloadSuccess = await reloadAPI();
        if (reloadSuccess) {
          devLog('getProducts - Successfully reloaded API cache');
        } else {
          console.warn('getProducts - API reload failed, proceeding with regular request');
        }
      } catch (reloadError) {
        console.warn('getProducts - Error during API reload, proceeding with regular request:', reloadError);
      }
    }
    
    // Always specify a long timeout for track-lighting products
    const isTrackLighting = params['filters[product_type][slug]'] === 'track-lighting';
    const options: RequestInit = {};
    
    if (isTrackLighting) {
      options.signal = AbortSignal.timeout(10000); // 10 second timeout for track lighting
    }
    
    // Using fetchAPI with built-in fallbacks to alternative URLs
    const result = await fetchAPI<{ data?: any[] }>(endpoint, options);
    
    // Process results to extract series_id from nested series data for each product
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((product: any) => {
        if (!product?.attributes) return;
        if (!product.attributes.series_id && product.attributes.series?.data) {
          product.attributes.series_id = product.attributes.series.data.id;
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('getProducts - Fetch failed:', error);
    throw error;
  }
}

/**
 * Get a product by slug only, useful when we need to find the correct path for a product
 */
export async function getProductBySlug(slug: string): Promise<any> {
  devLog(`getProductBySlug - Fetching product with slug: ${slug}`);
  
  try {
    return await fetchAPI(`/products/by-slug/${slug}`, {
      signal: AbortSignal.timeout(8000),
      allowNotFound: true,
    });
  } catch (error) {
    console.warn(`getProductBySlug - Error fetching product:`, error);
    return { data: null };
  }
}

/**
 * Get a product by its full path (type/series/product)
 * This matches the URL structure used in Next.js routes
 */
export const getProductByPath = cache(async function getProductByPath(
  typeSlug: string,
  seriesSlug: string,
  productSlug: string
): Promise<any> {
  devLog(`Fetching product by path: ${typeSlug}/${seriesSlug}/${productSlug}`);

  const isUnknownPath = typeSlug === 'unknown-category' || seriesSlug === 'unknown-series';

  if (isUnknownPath) {
    try {
      const data = await getProductBySlug(productSlug);
      if (!data || !data.data) {
        return { data: null };
      }

      const correctType = data.data.attributes.path?.type_slug;
      const correctSeries = data.data.attributes.path?.series_slug;

      if (correctType && correctSeries) {
        if (typeof window !== 'undefined') {
          window.location.href = `/products/${correctType}/${correctSeries}/${productSlug}`;
        }
        return data;
      }

      return data;
    } catch (pathError) {
      console.error(`Failed to find correct path for ${productSlug}:`, pathError);
    }
  }

  try {
    const data = await fetchAPI(`/products/by-path/${typeSlug}/${seriesSlug}/${productSlug}`, {
      allowNotFound: true,
    });
    if (!data || !(data as { data?: unknown }).data) {
      return await getProductBySlug(productSlug);
    }
    return data;
  } catch (error) {
    console.warn(`Failed to fetch product by path ${typeSlug}/${seriesSlug}/${productSlug}:`, error);
    try {
      return await getProductBySlug(productSlug);
    } catch {
      return { data: null };
    }
  }
});

/**
 * Featured series for the homepage.
 */
export const getFeaturedSeries = cache(async function getFeaturedSeries(): Promise<any> {
  return fetchAPI('/product-series/featured');
});

/**
 * @deprecated Featured catalog is series-level. Prefer getFeaturedSeries.
 */
export const getFeaturedProducts = cache(async function getFeaturedProducts(): Promise<any> {
  return getFeaturedSeries();
});

/**
 * Datasheet PDF generated from product specs (not a static file).
 */
export function getDatasheetUrl(slug: string) {
  return `/api/datasheets/${encodeURIComponent(slug)}`;
}

/**
 * Installation PDF generated from product mounting / size specs.
 */
export function getInstallationUrl(slug: string) {
  return `/api/datasheets/${encodeURIComponent(slug)}/installation`;
}

/**
 * Printable SKU label sheet generated from product specs.
 */
export function getProductLabelUrl(slug: string) {
  return `/api/labels/${encodeURIComponent(slug)}`;
}

/**
 * Brand-only LEVO label sheet (no SKU or electrical specs).
 */
export function getGeneralLabelUrl() {
  return '/api/labels/general';
}

/**
 * Stored EULUMDAT / LDT file for a product (built when admin/staff save the product).
 */
export function getLdtUrl(productId: number | string) {
  return `/api/products/${encodeURIComponent(String(productId))}/ldt`;
}

function seriesFileQuery(selection: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(selection)) {
    if (value) params.set(key, value);
  }
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function getSeriesDatasheetUrl(slug: string, selection: Record<string, string>) {
  return `/api/series/${encodeURIComponent(slug)}/datasheet${seriesFileQuery(selection)}`;
}

export function getSeriesFamilyDatasheetUrl(slug: string) {
  return `/api/series/${encodeURIComponent(slug)}/family-datasheet`;
}

/**
 * Series installation PDF (same guide for every SKU in the family).
 */
export function getSeriesInstallationUrl(slug: string) {
  return `/api/series/${encodeURIComponent(slug)}/installation`;
}

export function getSeriesLdtUrl(slug: string, selection: Record<string, string>) {
  return `/api/series/${encodeURIComponent(slug)}/ldt${seriesFileQuery(selection)}`;
}

export function getSeriesPolarUrl(slug: string, selection: Record<string, string>) {
  return `/api/series/${encodeURIComponent(slug)}/polar${seriesFileQuery(selection)}`;
}
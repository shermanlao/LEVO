import { absoluteUrl, siteOrigin, stripHtml } from '@/lib/seo';

export type JsonLd = Record<string, unknown>;

export function organizationJsonLd(input: {
  name: string;
  slogan?: string;
  url?: string;
  logo?: string;
  email?: string;
  telephone?: string;
  address?: string;
  sameAs?: string[];
}): JsonLd {
  const url = input.url || siteOrigin();
  const sameAs = (input.sameAs || []).filter(Boolean);
  const org: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url,
  };
  if (input.slogan) org.slogan = input.slogan;
  if (input.logo) org.logo = absoluteUrl(input.logo);
  if (input.email) org.email = input.email;
  if (input.telephone) org.telephone = input.telephone;
  if (input.address) {
    org.address = {
      '@type': 'PostalAddress',
      streetAddress: input.address,
    };
  }
  if (sameAs.length) org.sameAs = sameAs;
  return org;
}

export function websiteJsonLd(input: { name: string; url?: string }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url || siteOrigin(),
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path?: string }>
): JsonLd | null {
  const list = items.filter((item) => item.name);
  if (!list.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list.map((item, index) => {
      const entry: JsonLd = {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
      };
      if (item.path) entry.item = absoluteUrl(item.path);
      return entry;
    }),
  };
}

export function productJsonLd(input: {
  name: string;
  description?: string;
  image?: string | null;
  path: string;
  brandName: string;
}): JsonLd {
  const product: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    brand: {
      '@type': 'Brand',
      name: input.brandName,
    },
    url: absoluteUrl(input.path),
  };
  const description = stripHtml(input.description || '', 300);
  if (description) product.description = description;
  if (input.image) product.image = absoluteUrl(input.image);
  return product;
}

export function creativeWorkJsonLd(input: {
  name: string;
  description?: string;
  image?: string | null;
  path: string;
  location?: string;
  datePublished?: string;
}): JsonLd {
  const work: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: input.name,
    url: absoluteUrl(input.path),
  };
  const description = stripHtml(input.description || '', 300);
  if (description) work.description = description;
  if (input.image) work.image = absoluteUrl(input.image);
  if (input.location) work.contentLocation = input.location;
  if (input.datePublished) work.datePublished = input.datePublished;
  return work;
}

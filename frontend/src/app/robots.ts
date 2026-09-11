import type { MetadataRoute } from 'next';
import { getSiteContact } from '@/lib/sqlite-api';
import { siteOrigin } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = siteOrigin();
  let constructionOn = true;
  try {
    const contact = await getSiteContact();
    constructionOn = contact.public_under_construction !== false;
  } catch {
    /* assume construction when contact API is down */
  }

  if (constructionOn) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap: `${origin}/sitemap.xml`,
      host: origin,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/_next', '/search'],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}

import type { JsonLd as JsonLdData } from '@/lib/seo-jsonld';

export default function JsonLd({ data }: { data: JsonLdData | JsonLdData[] | null | undefined }) {
  if (!data) return null;
  const payload = Array.isArray(data) ? data.filter(Boolean) : data;
  if (Array.isArray(payload) && payload.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

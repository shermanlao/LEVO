import type { Metadata } from 'next';
import { getSiteContact, type SiteContact } from '@/lib/sqlite-api';
import PageRoute from '@/components/layout/PageRoute';
import { resourceRouteItems } from '@/components/layout/pageRouteItems';
import AlertBanner from '@/components/ui/AlertBanner';

export type ResourceKind = 'warranty' | 'certifications' | 'technical';

const RESOURCE: Record<
  ResourceKind,
  {
    titleKey: keyof SiteContact;
    bodyKey: keyof SiteContact;
    fallbackTitle: string;
    fallbackDescription: string;
  }
> = {
  warranty: {
    titleKey: 'resource_warranty_title',
    bodyKey: 'resource_warranty_body',
    fallbackTitle: 'Warranty',
    fallbackDescription: 'LEVO Lighting product warranty.',
  },
  certifications: {
    titleKey: 'resource_certifications_title',
    bodyKey: 'resource_certifications_body',
    fallbackTitle: 'Certifications',
    fallbackDescription: 'LEVO Lighting certifications.',
  },
  technical: {
    titleKey: 'resource_technical_title',
    bodyKey: 'resource_technical_body',
    fallbackTitle: 'Technical Underneath',
    fallbackDescription: 'Datasheets, installation guides, and photometric files.',
  },
};

function resourceCopy(contact: SiteContact | null, kind: ResourceKind) {
  const spec = RESOURCE[kind];
  const title = String(contact?.[spec.titleKey] || '').trim() || spec.fallbackTitle;
  const body = String(contact?.[spec.bodyKey] || '').trim();
  return { title, body, spec };
}

export async function generateResourceMetadata(kind: ResourceKind): Promise<Metadata> {
  const spec = RESOURCE[kind];
  try {
    const contact = await getSiteContact();
    const { title, body } = resourceCopy(contact, kind);
    const company = contact.company_name?.trim() || 'LEVO Lighting';
    const description = body.replace(/\s+/g, ' ').slice(0, 160) || spec.fallbackDescription;
    return {
      title: `${title} - ${company}`,
      description,
    };
  } catch {
    return {
      title: `${spec.fallbackTitle} - LEVO Lighting`,
      description: spec.fallbackDescription,
    };
  }
}

export default async function ResourcePage({ kind }: { kind: ResourceKind }) {
  let contact: SiteContact | null = null;
  let loadError: string | null = null;

  try {
    contact = await getSiteContact();
  } catch (error) {
    console.error(`ResourcePage (${kind}) - Failed to load site settings:`, error);
    loadError = 'Could not load this page. Check that the API and database are available.';
  }

  const { title, body } = resourceCopy(contact, kind);

  return (
    <div className="max-w-5xl mx-auto">
      <PageRoute items={resourceRouteItems(title)} />
      <h1 className="text-4xl font-bold mb-6">{title}</h1>
      {loadError ? <AlertBanner>{loadError}</AlertBanner> : null}
      {body ? (
        <div className="bg-gray-50 p-8 rounded-lg">
          <p className="text-lg whitespace-pre-wrap">{body}</p>
        </div>
      ) : null}
    </div>
  );
}

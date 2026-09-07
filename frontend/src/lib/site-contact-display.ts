import type { SiteContact } from '@/lib/sqlite-api';

export type VisibleContactField = {
  key: 'email' | 'phone' | 'address' | 'hours' | 'website';
  label: string;
  value: string;
  href?: string;
};

function line(
  key: VisibleContactField['key'],
  label: string,
  raw: string | undefined,
  href?: string
): VisibleContactField | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  return { key, label, value, href };
}

export function visibleContactFields(contact: SiteContact | null | undefined): VisibleContactField[] {
  if (!contact) return [];
  const website = String(contact.website || '').trim();
  return [
    line('email', 'Email', contact.email, contact.email?.trim() ? `mailto:${contact.email.trim()}` : undefined),
    line('phone', 'Phone', contact.phone, contact.phone?.trim() ? `tel:${contact.phone.trim()}` : undefined),
    line('address', 'Address', contact.address),
    line('hours', 'Hours', contact.hours),
    line('website', 'Website', website, website),
  ].filter((item): item is VisibleContactField => Boolean(item));
}

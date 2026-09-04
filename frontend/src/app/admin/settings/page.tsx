'use client';

import { FormEvent, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SiteAssetUploader from '@/components/admin/SiteAssetUploader';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { SelectField, TextareaField, TextInput } from '@/components/ui/FormField';
import type { SiteContact, WhyCard } from '@/lib/sqlite-api';

const EMPTY_CARDS: WhyCard[] = [
  { icon: 'energy', title: '', body: '' },
  { icon: 'lifespan', title: '', body: '' },
  { icon: 'design', title: '', body: '' },
];

function emptySettings(): SiteContact {
  return {
    heading: '',
    intro: '',
    email: '',
    phone: '',
    address: '',
    hours: '',
    website: '',
    datasheet_disclaimer: '',
    slogan: '',
    company_name: '',
    company_short_name: '',
    logo_header: '',
    logo_pdf: '',
    logo_icon: '',
    hero_title: '',
    hero_subtitle: '',
    hero_cta_label: '',
    hero_cta_href: '',
    hero_image: '',
    featured_heading: '',
    featured_projects_heading: '',
    why_heading: '',
    why_cards: EMPTY_CARDS,
    social_linkedin: '',
    social_instagram: '',
    social_facebook: '',
    social_threads: '',
    social_pinterest: '',
    resource_warranty_title: '',
    resource_warranty_body: '',
    resource_certifications_title: '',
    resource_certifications_body: '',
    resource_technical_title: '',
    resource_technical_body: '',
    seo_title: '',
    seo_description: '',
    og_image: '',
  };
}

export default function AdminSiteSettingsPage() {
  const [form, setForm] = useState<SiteContact>(emptySettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function apply(row: SiteContact) {
    const cards = Array.isArray(row.why_cards) && row.why_cards.length ? row.why_cards : EMPTY_CARDS;
    setForm({
      ...emptySettings(),
      ...row,
      why_cards: [0, 1, 2].map((i) => ({
        title: cards[i]?.title || '',
        body: cards[i]?.body || '',
        icon: cards[i]?.icon || EMPTY_CARDS[i].icon,
      })),
    });
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/site-settings', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load site settings');
      apply(json.data as SiteContact);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patch(partial: Partial<SiteContact>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function patchCard(index: number, partial: Partial<WhyCard>) {
    setForm((current) => {
      const cards = [...(current.why_cards || EMPTY_CARDS)];
      cards[index] = { ...cards[index], ...partial };
      return { ...current, why_cards: cards };
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save site settings');
      apply(json.data as SiteContact);
      setMessage('Site settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save site settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Site settings" showLogout />

      {error ? <AlertBanner className="mb-4">{error}</AlertBanner> : null}
      {message ? (
        <AlertBanner variant="success" className="mb-4">
          {message}
        </AlertBanner>
      ) : null}

      {loading ? (
        <p className="text-gray-500">Loading settings…</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold mb-2">Brand</h2>
            <p className="text-sm text-gray-500 mb-4">
              Company names, slogan, and logos used on the public site and generated PDFs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Company name"
                value={form.company_name || ''}
                onChange={(e) => patch({ company_name: e.target.value })}
              />
              <TextInput
                label="Short name"
                value={form.company_short_name || ''}
                onChange={(e) => patch({ company_short_name: e.target.value })}
              />
              <TextInput
                label="Slogan"
                value={form.slogan || ''}
                onChange={(e) => patch({ slogan: e.target.value })}
                className="md:col-span-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <SiteAssetUploader
                slot="header"
                label="Header logo"
                hint="Wordmark in the header and footer."
                imagePath={form.logo_header || ''}
                uploadHelpKey="admin.settings.logo_header_upload"
                removeHelpKey="admin.settings.logo_header_remove"
                onUploaded={(path) => patch({ logo_header: path })}
                onRemoved={() => patch({ logo_header: '' })}
              />
              <SiteAssetUploader
                slot="pdf"
                label="PDF logo"
                hint="Datasheets, installation guides, and labels. Falls back to the header logo."
                imagePath={form.logo_pdf || ''}
                uploadHelpKey="admin.settings.logo_pdf_upload"
                removeHelpKey="admin.settings.logo_pdf_remove"
                onUploaded={(path) => patch({ logo_pdf: path })}
                onRemoved={() => patch({ logo_pdf: '' })}
              />
              <SiteAssetUploader
                slot="icon"
                label="Tab icon"
                hint="Browser tab / favicon. Square PNG works best."
                imagePath={form.logo_icon || ''}
                uploadHelpKey="admin.settings.logo_icon_upload"
                removeHelpKey="admin.settings.logo_icon_remove"
                onUploaded={(path) => patch({ logo_icon: path })}
                onRemoved={() => patch({ logo_icon: '' })}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-2">Homepage</h2>
            <p className="text-sm text-gray-500 mb-4">
              Hero copy, featured section headings, and the Why Choose cards. Featured products and
              projects are still chosen on their list pages.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Hero title"
                value={form.hero_title || ''}
                onChange={(e) => patch({ hero_title: e.target.value })}
                className="md:col-span-2"
              />
              <TextareaField
                label="Hero subtitle"
                rows={3}
                value={form.hero_subtitle || ''}
                onChange={(e) => patch({ hero_subtitle: e.target.value })}
                className="md:col-span-2"
              />
              <TextInput
                label="Hero button label"
                value={form.hero_cta_label || ''}
                onChange={(e) => patch({ hero_cta_label: e.target.value })}
              />
              <TextInput
                label="Hero button link"
                value={form.hero_cta_href || ''}
                onChange={(e) => patch({ hero_cta_href: e.target.value })}
              />
              <TextInput
                label="Featured products heading"
                value={form.featured_heading || ''}
                onChange={(e) => patch({ featured_heading: e.target.value })}
              />
              <TextInput
                label="Featured projects heading"
                value={form.featured_projects_heading || ''}
                onChange={(e) => patch({ featured_projects_heading: e.target.value })}
              />
              <TextInput
                label="Why Choose heading"
                value={form.why_heading || ''}
                onChange={(e) => patch({ why_heading: e.target.value })}
                className="md:col-span-2"
              />
            </div>
            <div className="mt-6">
              <SiteAssetUploader
                slot="hero"
                label="Hero image"
                hint="Photo on the right side of the homepage hero."
                imagePath={form.hero_image || ''}
                uploadHelpKey="admin.settings.hero_image_upload"
                removeHelpKey="admin.settings.hero_image_remove"
                onUploaded={(path) => patch({ hero_image: path })}
                onRemoved={() => patch({ hero_image: '' })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {(form.why_cards || EMPTY_CARDS).map((card, index) => (
                <div key={index} className="space-y-3">
                  <TextInput
                    label={`Card ${index + 1} title`}
                    value={card.title}
                    onChange={(e) => patchCard(index, { title: e.target.value })}
                  />
                  <SelectField
                    label="Icon"
                    value={card.icon}
                    onChange={(e) =>
                      patchCard(index, { icon: e.target.value as WhyCard['icon'] })
                    }
                  >
                    <option value="energy">Energy</option>
                    <option value="lifespan">Lifespan</option>
                    <option value="design">Design</option>
                  </SelectField>
                  <TextareaField
                    label="Body"
                    rows={4}
                    value={card.body}
                    onChange={(e) => patchCard(index, { body: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-2">Contact and footer</h2>
            <p className="text-sm text-gray-500 mb-4">
              Shown on Contact Us, the footer, and datasheet PDF footers. Empty social links are hidden.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Contact heading"
                value={form.heading}
                onChange={(e) => patch({ heading: e.target.value })}
              />
              <TextInput
                label="Hours"
                value={form.hours}
                onChange={(e) => patch({ hours: e.target.value })}
              />
              <TextareaField
                label="Intro"
                rows={3}
                value={form.intro}
                onChange={(e) => patch({ intro: e.target.value })}
                className="md:col-span-2"
              />
              <TextInput
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
              />
              <TextInput
                label="Address"
                value={form.address}
                onChange={(e) => patch({ address: e.target.value })}
                className="md:col-span-2"
              />
              <TextInput
                label="Website"
                hint="Public catalog URL for datasheet QR codes, e.g. https://www.example.com"
                data-help-key="admin.settings.website"
                value={form.website || ''}
                onChange={(e) => patch({ website: e.target.value })}
              />
              <TextInput
                label="LinkedIn URL"
                value={form.social_linkedin || ''}
                onChange={(e) => patch({ social_linkedin: e.target.value })}
              />
              <TextInput
                label="Facebook URL"
                value={form.social_facebook || ''}
                onChange={(e) => patch({ social_facebook: e.target.value })}
              />
              <TextInput
                label="Instagram URL"
                value={form.social_instagram || ''}
                onChange={(e) => patch({ social_instagram: e.target.value })}
              />
              <TextInput
                label="Threads URL"
                value={form.social_threads || ''}
                onChange={(e) => patch({ social_threads: e.target.value })}
              />
              <TextInput
                label="Pinterest URL"
                value={form.social_pinterest || ''}
                onChange={(e) => patch({ social_pinterest: e.target.value })}
              />
              <TextareaField
                label="Datasheet disclaimer"
                rows={3}
                value={form.datasheet_disclaimer || ''}
                onChange={(e) => patch({ datasheet_disclaimer: e.target.value })}
                className="md:col-span-2"
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-2">Resources</h2>
            <p className="text-sm text-gray-500 mb-4">
              Footer Resource links open these pages. Title and body are shown on the public page.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Warranty title"
                value={form.resource_warranty_title || ''}
                onChange={(e) => patch({ resource_warranty_title: e.target.value })}
              />
              <TextareaField
                label="Warranty body"
                rows={4}
                value={form.resource_warranty_body || ''}
                onChange={(e) => patch({ resource_warranty_body: e.target.value })}
                className="md:col-span-2"
              />
              <TextInput
                label="Certifications title"
                value={form.resource_certifications_title || ''}
                onChange={(e) => patch({ resource_certifications_title: e.target.value })}
              />
              <TextareaField
                label="Certifications body"
                rows={4}
                value={form.resource_certifications_body || ''}
                onChange={(e) => patch({ resource_certifications_body: e.target.value })}
                className="md:col-span-2"
              />
              <TextInput
                label="Technical title"
                hint="Footer label stays Technical Underneath. This is the page heading."
                value={form.resource_technical_title || ''}
                onChange={(e) => patch({ resource_technical_title: e.target.value })}
              />
              <TextareaField
                label="Technical body"
                rows={4}
                value={form.resource_technical_body || ''}
                onChange={(e) => patch({ resource_technical_body: e.target.value })}
                className="md:col-span-2"
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-2">SEO</h2>
            <p className="text-sm text-gray-500 mb-4">
              Default browser title, description, and social preview image for the public site.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Default title"
                value={form.seo_title || ''}
                onChange={(e) => patch({ seo_title: e.target.value })}
              />
              <TextInput
                label="Default description"
                value={form.seo_description || ''}
                onChange={(e) => patch({ seo_description: e.target.value })}
              />
            </div>
            <div className="mt-6">
              <SiteAssetUploader
                slot="og"
                label="Open Graph image"
                hint="Optional image when the site is shared on social networks."
                imagePath={form.og_image || ''}
                uploadHelpKey="admin.settings.og_image_upload"
                removeHelpKey="admin.settings.og_image_remove"
                onUploaded={(path) => patch({ og_image: path })}
                onRemoved={() => patch({ og_image: '' })}
              />
            </div>
          </Card>

          <div className="flex gap-2">
            <Button helpKey="admin.settings.save" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

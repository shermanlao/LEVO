'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import NotFoundView from '@/components/layout/NotFoundView';

type Inquiry = {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

function formatReceived(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminInquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (response.status === 404) {
          setMissing(true);
          return;
        }
        if (!response.ok) {
          throw new Error(json.error || `Request failed (${response.status})`);
        }
        const row = json.data || json;
        setInquiry({
          id: Number(row.id),
          name: String(row.name || ''),
          email: String(row.email || ''),
          message: String(row.message || ''),
          created_at: String(row.created_at || ''),
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load inquiry');
      })
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (missing) {
    return (
      <NotFoundView
        title="Inquiry not found"
        description="This contact inquiry is not in the database."
        links={[
          { href: '/admin/inquiries', label: 'Back to inquiries', helpKey: 'admin.404.inquiries', variant: 'primary' },
          { href: '/admin', label: 'Dashboard', helpKey: 'admin.404.dashboard', variant: 'secondary' },
        ]}
      />
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={inquiry ? `Inquiry from ${inquiry.name}` : 'Contact inquiry'}
        backHref="/admin/inquiries"
        backLabel="Back to inquiries"
        backHelpKey="admin.404.inquiries"
        actions={
          inquiry?.email ? (
            <Button helpKey="admin.inquiries.email" variant="secondary" href={`mailto:${inquiry.email}`}>
              Email sender
            </Button>
          ) : null
        }
      />
      {error ? <AlertBanner>{error}</AlertBanner> : null}
      {loading ? <p className="text-gray-500">Loading...</p> : null}
      {inquiry ? (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Received">
              <p className="admin-field-value">{formatReceived(inquiry.created_at)}</p>
            </FormField>
            <FormField label="Name">
              <p className="admin-field-value">{inquiry.name}</p>
            </FormField>
            <FormField label="Email" className="md:col-span-2">
              <p className="admin-field-value">{inquiry.email}</p>
            </FormField>
            <FormField label="Message" className="md:col-span-2">
              <p className="admin-field-value whitespace-pre-wrap">{inquiry.message}</p>
            </FormField>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

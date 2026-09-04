'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';

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

function previewMessage(message: string) {
  const text = message.replace(/\s+/g, ' ').trim();
  if (text.length <= 80) return text;
  return `${text.slice(0, 80)}…`;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/inquiries', { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(json.error || `Request failed (${response.status})`);
        }
        const list = Array.isArray(json.data) ? json.data : [];
        setInquiries(
          list.map((row: Inquiry) => ({
            id: Number(row.id),
            name: String(row.name || ''),
            email: String(row.email || ''),
            message: String(row.message || ''),
            created_at: String(row.created_at || ''),
          }))
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load inquiries');
        setInquiries([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <AdminPageHeader title="Contact inquiries" />
      {error ? <AlertBanner>{error}</AlertBanner> : null}
      <AdminTable
        columns={['Received', 'Name', 'Email', 'Message', 'Actions']}
        loading={loading}
        empty={!loading && inquiries.length === 0}
      >
        {inquiries.map((inquiry) => (
          <tr key={inquiry.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatReceived(inquiry.created_at)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inquiry.name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{inquiry.email}</td>
            <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
              <span className="line-clamp-2">{previewMessage(inquiry.message)}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              <Button
                helpKey="admin.inquiries.view"
                variant="ghost"
                href={`/admin/inquiries/${inquiry.id}`}
                className="text-blue-600 hover:underline"
              >
                View
              </Button>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}

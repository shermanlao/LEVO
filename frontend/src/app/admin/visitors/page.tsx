'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatTile from '@/components/ui/StatTile';
import { parseVisitorDays } from '@shared/visitor-hit';

type CountRow = { label: string; views: number };

type VisitRow = {
  id: number;
  path: string;
  country: string | null;
  referrer: string | null;
  query_params: string | null;
  created_at: string;
};

type Analysis = {
  days: 7 | 30 | 90;
  uniqueVisitors: number;
  pageViews: number;
  countries: CountRow[];
  redirectLinks: CountRow[];
  parameters: CountRow[];
  visits: VisitRow[];
};

const RANGES: { days: 7 | 30 | 90; helpKey: string; label: string }[] = [
  { days: 7, helpKey: 'admin.visitors.range.7', label: '7 days' },
  { days: 30, helpKey: 'admin.visitors.range.30', label: '30 days' },
  { days: 90, helpKey: 'admin.visitors.range.90', label: '90 days' },
];

function formatSeen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function CountList({ title, rows, empty }: { title: string; rows: CountRow[]; empty: string }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="flex justify-between gap-4">
              <span className="font-mono text-gray-800 break-all">{row.label}</span>
              <span className="text-gray-500 tabular-nums shrink-0">{row.views}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AdminVisitorsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/visitors?days=${days}`, { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(json.error || `Request failed (${response.status})`);
        }
        const next: Analysis = {
          days: parseVisitorDays(json.days),
          uniqueVisitors: Number(json.uniqueVisitors) || 0,
          pageViews: Number(json.pageViews) || 0,
          countries: Array.isArray(json.countries) ? json.countries : [],
          redirectLinks: Array.isArray(json.redirectLinks) ? json.redirectLinks : [],
          parameters: Array.isArray(json.parameters) ? json.parameters : [],
          visits: Array.isArray(json.visits) ? json.visits : [],
        };
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load visitor analysis');
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div>
      <AdminPageHeader title="Visitor analysis" />
      {error ? <AlertBanner className="mb-6">{error}</AlertBanner> : null}
      <div className="flex flex-wrap gap-2 mb-6">
        {RANGES.map((range) => (
          <Button
            key={range.days}
            helpKey={range.helpKey}
            variant={days === range.days ? 'primary' : 'secondary'}
            onClick={() => setDays(range.days)}
          >
            {range.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile helpKey="admin.dash.stat.visitors" label="Unique visitors" value={data?.uniqueVisitors ?? null} />
        <StatTile helpKey="admin.dash.stat.views" label="Page views" value={data?.pageViews ?? null} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <CountList
          title="Country"
          rows={data?.countries || []}
          empty={loading ? 'Loading...' : 'No country data in this range.'}
        />
        <CountList
          title="Redirect link"
          rows={data?.redirectLinks || []}
          empty={loading ? 'Loading...' : 'No redirect links in this range.'}
        />
        <CountList
          title="Parameters"
          rows={data?.parameters || []}
          empty={loading ? 'Loading...' : 'No URL parameters in this range.'}
        />
      </div>
      <AdminTable
        columns={['Time', 'Country', 'Page', 'Redirect link', 'Parameters']}
        loading={loading}
        empty={!loading && (data?.visits.length || 0) === 0}
      >
        {(data?.visits || []).map((visit) => (
          <tr key={visit.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatSeen(String(visit.created_at))}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{visit.country || 'Unknown'}</td>
            <td className="px-6 py-4 text-sm font-mono text-gray-800 max-w-xs truncate" title={visit.path}>
              {visit.path}
            </td>
            <td
              className="px-6 py-4 text-sm font-mono text-gray-700 max-w-sm truncate"
              title={visit.referrer || 'Direct'}
            >
              {visit.referrer || 'Direct'}
            </td>
            <td
              className="px-6 py-4 text-sm font-mono text-gray-700 max-w-sm truncate"
              title={visit.query_params || ''}
            >
              {visit.query_params || '—'}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}

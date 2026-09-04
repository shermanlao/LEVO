'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminNavSectionBody from '@/components/admin/AdminNavSectionBody';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatTile from '@/components/ui/StatTile';
import { visibleAdminNavSections } from '@/lib/admin-nav';

type Me = { username: string; role: 'admin' | 'staff' };

type DashboardStats = {
  products: number;
  productTypes: number;
  productSeries: number;
  projects: number;
  featuredProducts: number;
  inquiriesTotal: number;
  inquiriesLast7Days: number;
  productsWithoutSeries: number;
  productsWithoutMainImage: number;
  users?: number;
  pageViewsLast7Days: number;
  uniqueVisitorsLast7Days: number;
  topPages: { path: string; views: number }[];
};

export default function AdminPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (json?.username && (json.role === 'admin' || json.role === 'staff')) {
          setMe({ username: json.username, role: json.role });
        }
      })
      .catch(() => {});

    fetch('/api/admin/dashboard', { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(json.error || `Dashboard failed (${response.status})`);
        }
        return json as DashboardStats;
      })
      .then((data) => {
        setStats(data);
        setApiStatus('connected');
        setErrorDetails('');
      })
      .catch((error) => {
        setApiStatus('error');
        setErrorDetails(error instanceof Error ? error.message : 'Could not load dashboard');
      });
  }, []);

  const apiPill =
    apiStatus === 'checking' ? (
      <span className="text-sm text-yellow-700">API: Checking…</span>
    ) : apiStatus === 'connected' ? (
      <span className="text-sm text-green-700">API: Connected</span>
    ) : (
      <span className="text-sm text-red-600">API: Not running</span>
    );

  return (
    <div>
      <AdminPageHeader
        title="Admin Dashboard"
        showLogout
        backHref="/"
        backLabel="Back to Homepage"
        backHelpKey="admin.nav.home"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            {me ? (
              <span>
                Signed in as <strong>{me.username}</strong> ({me.role})
              </span>
            ) : null}
            {apiPill}
          </div>
        }
      />

      {apiStatus === 'error' ? (
        <AlertBanner className="mb-6">
          <h3 className="font-medium">API server is not running</h3>
          {errorDetails ? <p className="mt-1 text-sm">{errorDetails}</p> : null}
          <p className="mt-2 text-sm">From the repo root run:</p>
          <div className="mt-2 bg-gray-800 text-white p-2 rounded font-mono text-sm">npm run dev</div>
        </AlertBanner>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          helpKey="admin.dash.stat.products"
          label="Size packs"
          value={stats?.products ?? null}
          href="/admin/product-series"
        />
        <StatTile
          helpKey="admin.dash.stat.types"
          label="Product types"
          value={stats?.productTypes ?? null}
          href="/admin/product-types"
        />
        <StatTile
          helpKey="admin.dash.stat.series"
          label="Series"
          value={stats?.productSeries ?? null}
          href="/admin/product-series"
        />
        <StatTile
          helpKey="admin.dash.stat.projects"
          label="Projects"
          value={stats?.projects ?? null}
          href="/admin/projects"
        />
        <StatTile
          helpKey="admin.dash.stat.inquiries"
          label="Inquiries (7 days)"
          value={stats?.inquiriesLast7Days ?? null}
          hint={stats ? `${stats.inquiriesTotal} all time` : undefined}
          href="/admin/inquiries"
        />
        <StatTile
          helpKey="admin.dash.stat.visitors"
          label="Unique visitors (7 days)"
          value={stats?.uniqueVisitorsLast7Days ?? null}
          hint="Public visitors only; staff excluded"
        />
        <StatTile
          helpKey="admin.dash.stat.views"
          label="Page views (7 days)"
          value={stats?.pageViewsLast7Days ?? null}
        />
        <StatTile
          helpKey="admin.dash.stat.featured"
          label="Featured series"
          value={stats?.featuredProducts ?? null}
          href="/admin/product-series"
        />
      </div>

      {stats?.topPages && stats.topPages.length > 0 ? (
        <Card className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Top pages (7 days)</h2>
          <ul className="space-y-1 text-sm">
            {stats.topPages.map((row) => (
              <li key={row.path} className="flex justify-between gap-4">
                <span className="font-mono text-gray-800 truncate">{row.path}</span>
                <span className="text-gray-500 tabular-nums">{row.views}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {visibleAdminNavSections(me?.role ?? null).map((section) => (
          <Card key={section.id}>
            <AdminNavSectionBody
              section={section}
              description={
                section.id === 'users' && stats?.users != null
                  ? `${stats.users} account${stats.users === 1 ? '' : 's'}`
                  : section.description
              }
            />
          </Card>
        ))}
      </div>

      {stats &&
      (stats.productsWithoutSeries > 0 || stats.productsWithoutMainImage > 0 || stats.inquiriesLast7Days > 0) ? (
        <Card className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Needs attention</h2>
          <ul className="space-y-2">
            {stats.productsWithoutSeries > 0 ? (
              <li>
                <Button helpKey="admin.dash.attention.no_series" variant="ghost" href="/admin/product-series" className="text-blue-600 hover:underline">
                  {stats.productsWithoutSeries} series with no featured image
                </Button>
              </li>
            ) : null}
            {stats.productsWithoutMainImage > 0 ? (
              <li>
                <Button helpKey="admin.dash.attention.no_photo" variant="ghost" href="/admin/product-series" className="text-blue-600 hover:underline">
                  {stats.productsWithoutMainImage} size pack{stats.productsWithoutMainImage === 1 ? '' : 's'} with no main photo
                </Button>
              </li>
            ) : null}
            {stats.inquiriesLast7Days > 0 ? (
              <li>
                <Button helpKey="admin.dash.attention.inquiries" variant="ghost" href="/admin/inquiries" className="text-blue-600 hover:underline">
                  {stats.inquiriesLast7Days} contact inquir{stats.inquiriesLast7Days === 1 ? 'y' : 'ies'} in the last 7 days
                  {stats.inquiriesTotal ? ` (${stats.inquiriesTotal} all time)` : ''}
                </Button>
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import {
  ADMIN_PAGES,
  ADMIN_ROLE_HINTS,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLES,
  FORBIDDEN_ROLE_PAGES,
  LOCKED_ROLE_PAGES,
  defaultRolePageMatrix,
  roleCanOpenPage,
  sanitizeRolePageMatrix,
  type AdminPageKey,
  type AdminRole,
} from '@shared/admin-roles';

function cellLocked(role: AdminRole, page: AdminPageKey): boolean {
  return (
    (LOCKED_ROLE_PAGES[role] || []).includes(page) ||
    (FORBIDDEN_ROLE_PAGES[role] || []).includes(page)
  );
}

export default function AdminPageAccessPage() {
  const [matrix, setMatrix] = useState(defaultRolePageMatrix());
  const [saved, setSaved] = useState(defaultRolePageMatrix());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/permissions', { cache: 'no-store' });
      if (response.status === 403) {
        window.location.href = '/admin';
        return;
      }
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || `Request failed (${response.status})`);
      }
      const next = sanitizeRolePageMatrix(json.data);
      setMatrix(next);
      setSaved(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page access');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = JSON.stringify(matrix) !== JSON.stringify(saved);

  function toggle(role: AdminRole, page: AdminPageKey) {
    if (cellLocked(role, page)) return;
    setMatrix((prev) => {
      const has = prev[role].includes(page);
      const pages = has ? prev[role].filter((key) => key !== page) : [...prev[role], page];
      return sanitizeRolePageMatrix({ ...prev, [role]: pages });
    });
    setSuccess(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matrix),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Could not save page access');
      }
      const next = sanitizeRolePageMatrix(json.data);
      setMatrix(next);
      setSaved(next);
      setSuccess('Page access saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save page access');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/permissions', { method: 'POST' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Could not reset page access');
      }
      const next = sanitizeRolePageMatrix(json.data);
      setMatrix(next);
      setSaved(next);
      setSuccess('Page access reset to defaults.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset page access');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Page access"
        backHref="/admin/users"
        backLabel="Back to Users"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              helpKey="admin.users.access.reset"
              variant="secondary"
              type="button"
              disabled={saving || loading}
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              helpKey="admin.users.access.save"
              type="button"
              disabled={saving || loading || !dirty}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      />

      <p className="text-sm text-gray-600 mb-6 max-w-3xl">
        Grant admin pages by role, the same way LightX sets page access. System always keeps Users
        and Page access. Operation cannot manage users or this matrix.
      </p>

      {error ? <AlertBanner>{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <AdminTable
        columns={['Role', ...ADMIN_PAGES.map((page) => page.label)]}
        loading={loading}
        empty={false}
      >
        {ADMIN_ROLES.map((role) => (
          <tr key={role}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <div className="font-medium">{ADMIN_ROLE_LABELS[role]}</div>
              <div className="text-xs text-gray-500 max-w-xs">{ADMIN_ROLE_HINTS[role]}</div>
            </td>
            {ADMIN_PAGES.map((page) => {
              const checked = roleCanOpenPage(role, page.key, matrix[role]);
              const locked = cellLocked(role, page.key);
              return (
                <td key={page.key} className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    data-help-key="admin.users.access.toggle"
                    checked={checked}
                    disabled={locked || saving || loading}
                    aria-label={`${ADMIN_ROLE_LABELS[role]} ${page.label}`}
                    onChange={() => toggle(role, page.key)}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}

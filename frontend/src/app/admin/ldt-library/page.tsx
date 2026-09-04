'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import HelpButton from '@/components/admin/HelpButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';

type TemplateRow = {
  id: number;
  beamDegrees: number;
  family: string;
  fileName: string;
  fileSize: number;
  source: string;
  uploadedAt: string | null;
  updatedAt: string | null;
};

function familyLabel(family: string): string {
  return family === 'linear' ? 'Linear' : 'Circular';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LdtLibraryAdminPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/photometric-library', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load LDT library');
      setRows(data.templates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load LDT library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(id: number, file: File | undefined) {
    if (!file) return;
    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/admin/photometric-library/${id}`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMessage(`Replaced ${file.name}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusyId(null);
    }
  }

  async function onRestore(id: number, beamDegrees: number) {
    setBusyId(id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/photometric-library/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setMessage(`Restored calculated ${beamDegrees}° file`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminPageHeader title="LDT library" showLogout />

      <p className="text-gray-600 mb-6 max-w-3xl">
        Circular cones and linear / LED-strip samples used when a product downloads an LDT or a
        photometric polar drawing. Replace a slot with a measured factory file, or restore the
        calculated file.
      </p>

      {error && <AlertBanner>{error}</AlertBanner>}
      {message && <AlertBanner variant="success">{message}</AlertBanner>}

      <div className="bg-white shadow-md rounded overflow-x-auto">
        {loading ? (
          <p className="p-6 text-gray-500">Loading library…</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">Shape</th>
                <th className="px-4 py-3">Beam</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">{familyLabel(row.family)}</td>
                  <td className="px-4 py-3">{row.beamDegrees}°</td>
                  <td className="px-4 py-3">
                    {row.fileName} ({formatBytes(row.fileSize)})
                  </td>
                  <td className="px-4 py-3 capitalize">{row.source}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/admin/photometric-library/${row.id}`}
                        className="bg-gray-100 text-gray-800 px-3 py-1 rounded hover:bg-gray-200"
                      >
                        Download
                      </a>
                      <input
                        ref={(el) => {
                          fileInputs.current[String(row.id)] = el;
                        }}
                        type="file"
                        accept=".ldt"
                        className="hidden"
                        onChange={(e) => onUpload(row.id, e.target.files?.[0])}
                      />
                      <Button
                        helpKey="admin.ldt_library.replace"
                        variant="secondary"
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => fileInputs.current[String(row.id)]?.click()}
                      >
                        Replace
                      </Button>
                      {row.source === 'uploaded' ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-60"
                          onClick={() => onRestore(row.id, row.beamDegrees)}
                        >
                          Restore
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

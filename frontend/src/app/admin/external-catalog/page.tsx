'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import HelpButton from '@/components/admin/HelpButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';

type Settings = {
  id: number;
  name: string;
  base_url: string;
  api_key: string;
  password_saved: boolean;
  is_active: boolean;
};

export default function ExternalCatalogSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState('LightX');
  const [baseUrl, setBaseUrl] = useState('https://lightx.synology.me/api/external/v1');
  const [apiKey, setApiKey] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/external-catalog/settings', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load settings');
      const row = data.data as Settings;
      setSettings(row);
      setName(row.name || 'LightX');
      setBaseUrl(row.base_url || 'https://lightx.synology.me/api/external/v1');
      setApiKey(row.api_key || '');
      setApiPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: Record<string, string> = {
        name,
        base_url: baseUrl,
        api_key: apiKey,
      };
      if (apiPassword.trim()) {
        payload.api_password = apiPassword;
      }
      const response = await fetch('/api/admin/external-catalog/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save settings');
      setSettings(data.data);
      setApiPassword('');
      setMessage('Partner API settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/admin/external-catalog/settings/test', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Connection test failed');
      }
      setMessage(`Connected. LightX reported ${data.total ?? 0} products.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Partner catalog (LightX)"
        showLogout
        actions={
          <Button helpKey="admin.external_catalog.import_link" variant="ghost" href="/admin/product-series">
            Import on Series
          </Button>
        }
      />

      {error && <AlertBanner>{error}</AlertBanner>}
      {message && <AlertBanner variant="success">{message}</AlertBanner>}

      <div className="bg-white shadow-md rounded p-6 max-w-2xl">
        <p className="text-gray-600 mb-6">
          LEVO fetches the partner catalog with a read-only LightX API key and password. Credentials
          stay on the server and are never sent back to the browser after save.
        </p>
        {loading ? (
          <p className="text-gray-500">Loading settings...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Base URL</label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">API key</label>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">API password</label>
              <input
                type="password"
                value={apiPassword}
                onChange={(e) => setApiPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder={settings?.password_saved ? 'Saved — enter a new password to replace it' : ''}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button helpKey="admin.external_catalog.save" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button helpKey="admin.external_catalog.test" variant="secondary" type="button" onClick={handleTest} disabled={testing}>
                {testing ? 'Testing...' : 'Test connection'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

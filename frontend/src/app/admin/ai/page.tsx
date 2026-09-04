'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';
import HelpButton from '@/components/admin/HelpButton';
import SizeDrawingStyleUploader from '@/components/ai/SizeDrawingStyleUploader';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';

type Settings = {
  provider: string;
  base_url: string;
  model_id: string;
  parsing_hints: string;
  size_drawing_prompt: string;
  size_drawing_refine_prompt: string;
  size_drawing_prompt_default: string;
  size_drawing_refine_prompt_default: string;
  size_drawing_style_image: string | null;
  key_presence: Record<string, boolean>;
  env_key_overrides: boolean;
  env_provider: string | null;
  feature_model_routing: Record<string, { provider?: string; modelId?: string }>;
  features: Array<{ id: string; label: string }>;
  presets: Array<{ id: string; label: string; baseUrl: string; modelId: string }>;
};

type Usage = {
  requestCount: number;
  totalTokens: number;
  estimatedUsd: number;
  byFeature: Record<string, { count: number; tokens: number; costUsd: number }>;
};

const PROVIDERS = ['xai', 'openai', 'google', 'openrouter'] as const;

export default function AdminAiSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [period, setPeriod] = useState('30d');
  const [provider, setProvider] = useState('xai');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [hints, setHints] = useState('');
  const [sizeDrawingPrompt, setSizeDrawingPrompt] = useState('');
  const [sizeDrawingRefinePrompt, setSizeDrawingRefinePrompt] = useState('');
  const [sizeDrawingStyleImage, setSizeDrawingStyleImage] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [routing, setRouting] = useState<Record<string, { provider?: string; modelId?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, usageRes] = await Promise.all([
        fetch('/api/admin/ai/settings', { cache: 'no-store' }),
        fetch(`/api/admin/ai/usage?period=${period}`, { cache: 'no-store' }),
      ]);
      const settingsJson = await settingsRes.json();
      if (!settingsRes.ok) throw new Error(settingsJson.error || 'Failed to load AI settings');
      const row = settingsJson.data as Settings;
      setSettings(row);
      setProvider(row.provider || 'xai');
      setBaseUrl(row.base_url || '');
      setModelId(row.model_id || '');
      setHints(row.parsing_hints || '');
      setSizeDrawingPrompt(row.size_drawing_prompt || '');
      setSizeDrawingRefinePrompt(row.size_drawing_refine_prompt || '');
      setSizeDrawingStyleImage(row.size_drawing_style_image || null);
      setRouting(row.feature_model_routing || {});
      const usageJson = await usageRes.json();
      if (usageRes.ok) setUsage(usageJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function settingsPayload() {
    const provider_keys: Record<string, string> = {};
    for (const [id, value] of Object.entries(keys)) {
      if (value.trim()) provider_keys[id] = value.trim();
    }
    return {
      provider,
      base_url: baseUrl,
      model_id: modelId,
      parsing_hints: hints,
      size_drawing_prompt: sizeDrawingPrompt,
      size_drawing_refine_prompt: sizeDrawingRefinePrompt,
      provider_keys,
      feature_model_routing: routing,
    };
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await settingsPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSettings(data.data);
      setSizeDrawingPrompt(data.data.size_drawing_prompt || '');
      setSizeDrawingRefinePrompt(data.data.size_drawing_refine_prompt || '');
      setSizeDrawingStyleImage(data.data.size_drawing_style_image || null);
      setKeys({});
      setMessage('AI settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await settingsPayload()),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Connection test failed');
      if (data.data) {
        setSettings(data.data);
        setSizeDrawingPrompt(data.data.size_drawing_prompt || '');
        setSizeDrawingRefinePrompt(data.data.size_drawing_refine_prompt || '');
        setSizeDrawingStyleImage(data.data.size_drawing_style_image || null);
        setKeys({});
      }
      setMessage(data.message || 'Connected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="AI settings" showLogout />

      {error && <AlertBanner>{error}</AlertBanner>}
      {message && <AlertBanner variant="success">{message}</AlertBanner>}

      <div className="bg-white shadow-md rounded p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Usage & spending</h2>
          <select
            className="border border-gray-300 rounded px-3 py-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        {usage ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="border rounded p-4">
              <p className="text-sm text-gray-500">Requests</p>
              <p className="text-2xl font-semibold">{usage.requestCount}</p>
            </div>
            <div className="border rounded p-4">
              <p className="text-sm text-gray-500">Tokens</p>
              <p className="text-2xl font-semibold">{usage.totalTokens}</p>
            </div>
            <div className="border rounded p-4">
              <p className="text-sm text-gray-500">Est. cost (USD)</p>
              <p className="text-2xl font-semibold">{usage.estimatedUsd.toFixed(4)}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No usage yet.</p>
        )}
        {usage && Object.keys(usage.byFeature).length > 0 ? (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Feature</th>
                <th className="py-2">Requests</th>
                <th className="py-2">Tokens</th>
                <th className="py-2">USD</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(usage.byFeature).map(([feature, row]) => (
                <tr key={feature} className="border-t">
                  <td className="py-2">{feature}</td>
                  <td className="py-2">{row.count}</td>
                  <td className="py-2">{row.tokens}</td>
                  <td className="py-2">{row.costUsd.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="bg-white shadow-md rounded p-6 max-w-3xl">
        <p className="text-gray-600 mb-6">
          Size drawing and main-photo edit use xAI Imagine or Google Gemini Image. Other providers
          can be stored for failover and routing. Env <code>AI_API_KEY</code> overrides the matching
          provider when set. Paste a key, then click <strong>Test connection</strong> (that also
          saves it) or <strong>Save</strong>.
        </p>
        {loading || !settings ? (
          <p className="text-gray-500">Loading settings...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Default provider</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  const preset = settings.presets.find((p) => p.id === e.target.value);
                  if (preset) {
                    setBaseUrl(preset.baseUrl);
                    setModelId(preset.modelId);
                  }
                }}
              >
                {settings.presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Base URL</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Default model</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              />
            </div>

            <div>
              <h3 className="font-medium mb-2">API keys</h3>
              {PROVIDERS.map((id) => (
                <div key={id} className="mb-3">
                  <label className="block text-gray-700 mb-1 capitalize">
                    {id} {settings.key_presence[id] ? '(saved)' : ''}
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={keys[id] || ''}
                    placeholder={settings.key_presence[id] ? 'Saved — enter a new key to replace it' : ''}
                    autoComplete="new-password"
                    onChange={(e) => setKeys((prev) => ({ ...prev, [id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-medium mb-2">Feature routing</h3>
              <p className="text-sm text-gray-500 mb-2">
                Size drawing and photo edit only run on xAI or Google. Leave as Default to use the
                org provider.
              </p>
              {(settings.features || [])
                .filter((f) => f.id !== 'connection_test')
                .map((feature) => (
                  <div key={feature.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <label className="text-sm">
                      <span className="block text-gray-600 mb-1">{feature.label} provider</span>
                      <select
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={routing[feature.id]?.provider || ''}
                        onChange={(e) =>
                          setRouting((prev) => ({
                            ...prev,
                            [feature.id]: { ...prev[feature.id], provider: e.target.value || undefined },
                          }))
                        }
                      >
                        <option value="">Default</option>
                        {PROVIDERS.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="block text-gray-600 mb-1">{feature.label} model</span>
                      <input
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={routing[feature.id]?.modelId || ''}
                        placeholder="Leave blank for default"
                        onChange={(e) =>
                          setRouting((prev) => ({
                            ...prev,
                            [feature.id]: { ...prev[feature.id], modelId: e.target.value || undefined },
                          }))
                        }
                      />
                    </label>
                  </div>
                ))}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Organization parsing hints</label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={4}
                value={hints}
                onChange={(e) => setHints(e.target.value)}
                placeholder="Optional notes injected into size-drawing and photo-edit prompts"
              />
            </div>

            <SizeDrawingStyleUploader
              imagePath={sizeDrawingStyleImage}
              onUploaded={(path) => {
                setSizeDrawingStyleImage(path);
                setSettings((prev) =>
                  prev ? { ...prev, size_drawing_style_image: path } : prev
                );
              }}
              onRemoved={() => {
                setSizeDrawingStyleImage(null);
                setSettings((prev) =>
                  prev ? { ...prev, size_drawing_style_image: null } : prev
                );
              }}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-700">Size drawing prompt</label>
                <HelpButton
                  helpKey="admin.ai.size_drawing_prompt_reset"
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() =>
                    setSizeDrawingPrompt(settings.size_drawing_prompt_default || sizeDrawingPrompt)
                  }
                >
                  Reset to default
                </HelpButton>
              </div>
              <textarea
                data-help-key="admin.ai.size_drawing_prompt"
                title="Template sent when generating a size drawing. Placeholders: {{size}}, {{cuthole_line}}, {{hints_line}}."
                className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                rows={10}
                value={sizeDrawingPrompt}
                onChange={(e) => setSizeDrawingPrompt(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Placeholders: {'{{size}}'}, {'{{cuthole_line}}'}, {'{{hints_line}}'}. The server always
                prepends a 2D elevation lock so the cropped main photo is used for outline only, not
                camera angle.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-700">Size drawing refine prompt</label>
                <HelpButton
                  helpKey="admin.ai.size_drawing_refine_prompt_reset"
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() =>
                    setSizeDrawingRefinePrompt(
                      settings.size_drawing_refine_prompt_default || sizeDrawingRefinePrompt
                    )
                  }
                >
                  Reset to default
                </HelpButton>
              </div>
              <textarea
                data-help-key="admin.ai.size_drawing_refine_prompt"
                title="Template sent when refining a size drawing from chat. Placeholders: {{instruction}}, {{size}}, {{cuthole_line}}, {{hints_line}}."
                className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                rows={12}
                value={sizeDrawingRefinePrompt}
                onChange={(e) => setSizeDrawingRefinePrompt(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Placeholders: {'{{instruction}}'}, {'{{size}}'}, {'{{cuthole_line}}'}, {'{{hints_line}}'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button helpKey="admin.ai.save" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button helpKey="admin.ai.test" variant="secondary" type="button" onClick={handleTest} disabled={testing}>
                {testing ? 'Testing...' : 'Test connection'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

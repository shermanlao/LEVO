'use client';

import { FormEvent, useEffect, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import StyleReferenceUploader from '@/components/ai/StyleReferenceUploader';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import type { AiFeatureRouting, AiSettings, AiUsage } from '@/lib/ai-settings-types';

const PROVIDERS = ['xai', 'openai', 'google', 'openrouter'] as const;

export default function AiSettingsPage() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [period, setPeriod] = useState('30d');
  const [provider, setProvider] = useState('xai');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [hints, setHints] = useState('');
  const [sizeDrawingPrompt, setSizeDrawingPrompt] = useState('');
  const [sizeDrawingRefinePrompt, setSizeDrawingRefinePrompt] = useState('');
  const [sizeDrawingStyleImage, setSizeDrawingStyleImage] = useState<string | null>(null);
  const [productPhotoStyleImage, setProductPhotoStyleImage] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [routing, setRouting] = useState<AiFeatureRouting>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
        const row = settingsJson.data as AiSettings;
        if (cancelled) return;
        setSettings(row);
        setProvider(row.provider || 'xai');
        setBaseUrl(row.base_url || '');
        setModelId(row.model_id || '');
        setHints(row.parsing_hints || '');
        setSizeDrawingPrompt(row.size_drawing_prompt || '');
        setSizeDrawingRefinePrompt(row.size_drawing_refine_prompt || '');
        setSizeDrawingStyleImage(row.size_drawing_style_image || null);
        setProductPhotoStyleImage(row.product_photo_style_image || null);
        setRouting(row.feature_model_routing || {});
        const usageJson = await usageRes.json();
        if (usageRes.ok && !cancelled) setUsage(usageJson.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load AI settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  async function settingsPayload() {
    const providerKeys: Record<string, string> = {};
    for (const [id, value] of Object.entries(keys)) {
      if (value.trim()) providerKeys[id] = value.trim();
    }
    return {
      provider,
      base_url: baseUrl,
      model_id: modelId,
      parsing_hints: hints,
      size_drawing_prompt: sizeDrawingPrompt,
      size_drawing_refine_prompt: sizeDrawingRefinePrompt,
      provider_keys: providerKeys,
      feature_model_routing: routing,
    };
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
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
      setProductPhotoStyleImage(data.data.product_photo_style_image || null);
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
        setProductPhotoStyleImage(data.data.product_photo_style_image || null);
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
      {error ? <AlertBanner>{error}</AlertBanner> : null}
      {message ? <AlertBanner variant="success">{message}</AlertBanner> : null}
      <div className="bg-white shadow-md rounded p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Usage and spending</h2>
          <select
            className="border border-gray-300 rounded px-3 py-2 text-sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        {usage ? (
          <div>
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
            <p className="text-xs text-gray-500 mb-4">
              xAI image cost is the billed amount (ticks / 10^10). Google image cost is estimated from
              Gemini token rates. Token totals omit xAI image calls that do not return tokens.
            </p>
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
          can be stored for failover and routing. Env AI_API_KEY overrides the matching provider when
          set. Paste a key, then click Test connection (that also saves it) or Save.
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
                onChange={(event) => {
                  setProvider(event.target.value);
                  const preset = settings.presets.find((item) => item.id === event.target.value);
                  if (preset) {
                    setBaseUrl(preset.baseUrl);
                    setModelId(preset.modelId);
                  }
                }}
              >
                {settings.presets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Base URL</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Default model</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
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
                    onChange={(event) => setKeys((prev) => ({ ...prev, [id]: event.target.value }))}
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
                .filter((feature) => feature.id !== 'connection_test' && feature.id !== 'product_photo_style')
                .map((feature) => (
                  <div key={feature.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <label className="text-sm">
                      <span className="block text-gray-600 mb-1">{feature.label} provider</span>
                      <select
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={routing[feature.id]?.provider || ''}
                        onChange={(event) =>
                          setRouting((prev) => ({
                            ...prev,
                            [feature.id]: { ...prev[feature.id], provider: event.target.value || undefined },
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
                        onChange={(event) =>
                          setRouting((prev) => ({
                            ...prev,
                            [feature.id]: { ...prev[feature.id], modelId: event.target.value || undefined },
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
                onChange={(event) => setHints(event.target.value)}
                placeholder="Optional notes injected into size-drawing and photo-edit prompts"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StyleReferenceUploader
                imagePath={sizeDrawingStyleImage}
                title="Size drawing style"
                description="Optional 2D size drawing used as the style for Generate by AI. The product crop still supplies the fixture outline."
                alt="Size drawing style reference"
                endpoint="/api/admin/ai/size-drawing-style"
                pathField="size_drawing_style_image"
                uploadHelpKey="admin.ai.size_drawing_style_upload"
                removeHelpKey="admin.ai.size_drawing_style_remove"
                removeConfirm="Remove the size drawing style reference?"
                onUploaded={(path) => {
                  setSizeDrawingStyleImage(path);
                  setSettings((prev) => (prev ? { ...prev, size_drawing_style_image: path } : prev));
                }}
                onRemoved={() => {
                  setSizeDrawingStyleImage(null);
                  setSettings((prev) => (prev ? { ...prev, size_drawing_style_image: null } : prev));
                }}
              />
              <StyleReferenceUploader
                imagePath={productPhotoStyleImage}
                title="Catalog photo style"
                description="Optional house-style product photo. Match catalog style on Main A or Main B copies its lighting and background. Upload still saves the original."
                alt="Catalog photo style reference"
                endpoint="/api/admin/ai/product-photo-style"
                pathField="product_photo_style_image"
                uploadHelpKey="admin.ai.product_photo_style_upload"
                removeHelpKey="admin.ai.product_photo_style_remove"
                removeConfirm="Remove the catalog photo style reference?"
                onUploaded={(path) => {
                  setProductPhotoStyleImage(path);
                  setSettings((prev) => (prev ? { ...prev, product_photo_style_image: path } : prev));
                }}
                onRemoved={() => {
                  setProductPhotoStyleImage(null);
                  setSettings((prev) => (prev ? { ...prev, product_photo_style_image: null } : prev));
                }}
              />
            </div>
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
                title="Template sent when generating a size drawing."
                className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                rows={10}
                value={sizeDrawingPrompt}
                onChange={(event) => setSizeDrawingPrompt(event.target.value)}
              />
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
                title="Template sent when refining a size drawing from chat."
                className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                rows={12}
                value={sizeDrawingRefinePrompt}
                onChange={(event) => setSizeDrawingRefinePrompt(event.target.value)}
              />
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

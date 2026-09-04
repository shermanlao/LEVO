'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import { adminFetchJson } from '@/lib/admin-fetch';
import DatasheetLabelManager from '@/components/admin/DatasheetLabelManager';
import {
  catalogVariantFields,
  groupCatalogByKind,
  variantKindLabel,
  type VariantCatalogOption,
} from '@shared/series-options';

type DraftOption = { value: string; code: string; label_image?: string | null };

function draftsFromCatalog(options: VariantCatalogOption[]): Record<string, DraftOption[]> {
  const grouped = groupCatalogByKind(options);
  const drafts: Record<string, DraftOption[]> = {};
  for (const field of catalogVariantFields()) {
    drafts[field.key] = (grouped[field.key] || []).map((option) => ({
      value: option.value || '',
      code: option.code || '',
      label_image: option.label_image || null,
    }));
  }
  return drafts;
}

function flattenDrafts(drafts: Record<string, DraftOption[]>): VariantCatalogOption[] {
  const out: VariantCatalogOption[] = [];
  let sort = 0;
  for (const field of catalogVariantFields()) {
    for (const row of drafts[field.key] || []) {
      const value = row.value.trim();
      if (!value) continue;
      out.push({
        kind: field.key,
        value,
        code: row.code.trim(),
        sort_order: sort,
        label_image: row.label_image || null,
      });
      sort += 1;
    }
  }
  return out;
}

export default function VariantOptionsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftOption[]>>({});
  const [catalog, setCatalog] = useState<VariantCatalogOption[]>([]);

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    setError(null);
    const result = await adminFetchJson<{ data?: VariantCatalogOption[] }>('/variant-options');
    if (!quiet) setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const options = Array.isArray(result.data?.data) ? result.data.data : [];
    setCatalog(options);
    setDrafts(draftsFromCatalog(options));
  }

  useEffect(() => {
    void load();
  }, []);

  const fields = useMemo(() => catalogVariantFields(), []);

  function updateRow(kind: string, index: number, patch: Partial<DraftOption>) {
    setDrafts((prev) => {
      const list = [...(prev[kind] || [])];
      list[index] = { ...list[index], ...patch };
      return { ...prev, [kind]: list };
    });
  }

  function addRow(kind: string) {
    setDrafts((prev) => ({
      ...prev,
      [kind]: [...(prev[kind] || []), { value: '', code: '', label_image: null }],
    }));
  }

  function removeRow(kind: string, index: number) {
    setDrafts((prev) => ({
      ...prev,
      [kind]: (prev[kind] || []).filter((_, i) => i !== index),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await adminFetchJson('/variant-options', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: flattenDrafts(drafts) }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess('Variant options saved.');
    await load();
  }

  return (
    <div>
      <AdminPageHeader
        title="Variant"
        backHref="/admin"
        backLabel="Back to Admin"
        backHelpKey="admin.variant_options.back"
        actions={
          <Button helpKey="admin.variant_options.save" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save variant options'}
          </Button>
        }
      />

      <p className="text-sm text-gray-600 mb-4">
        Add option labels, SKU codes, and datasheet badge artwork for each variant. Series pages then
        add these options as tags and reuse the matching label. Extra datasheet icons (CE, DALI) are
        created here and picked on each series. Size is edited on each series.
        Example: CCT <span className="font-mono">3000K</span> / <span className="font-mono">30K</span>.
      </p>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}
      {loading ? <p className="text-gray-500">Loading options…</p> : null}

      {!loading ? <DatasheetLabelManager catalog={catalog} onChanged={() => void load(true)} /> : null}

      {!loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-8">
          {fields.map((field) => {
            const rows = drafts[field.key] || [];
            return (
              <div key={field.key} className="bg-white shadow-md rounded px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold">{variantKindLabel(field.key)}</h2>
                  <Button
                    helpKey="admin.variant_options.option_add"
                    variant="secondary"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => addRow(field.key)}
                  >
                    Add option
                  </Button>
                </div>
                {rows.length === 0 ? (
                  <p className="text-xs text-gray-500">No options yet.</p>
                ) : (
                  <div className="grid grid-cols-[1fr_5.5rem_auto] gap-x-2 gap-y-1 items-center">
                    <span className="text-xs font-semibold text-gray-600">Option</span>
                    <span className="text-xs font-semibold text-gray-600">Code</span>
                    <span />
                    {rows.map((row, index) => (
                      <div key={`${field.key}-${index}`} className="contents">
                        <input
                          className="input-field-sm"
                          value={row.value}
                          onChange={(e) => updateRow(field.key, index, { value: e.target.value })}
                          placeholder="3000K"
                          aria-label={`${variantKindLabel(field.key)} option`}
                        />
                        <input
                          className="input-field-sm"
                          value={row.code}
                          onChange={(e) => updateRow(field.key, index, { code: e.target.value })}
                          placeholder="30K"
                          aria-label={`${variantKindLabel(field.key)} code`}
                        />
                        <Button
                          helpKey="admin.variant_options.option_remove"
                          variant="danger"
                          className="!px-2 !py-1 text-xs"
                          onClick={() => removeRow(field.key, index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import HelpButton from '@/components/admin/HelpButton';
import OptionTag from '@/components/ui/OptionTag';
import { TextInput, SelectField } from '@/components/ui/FormField';
import PartnerImportPanel from '@/components/admin/PartnerImportPanel';
import SizePackPhotos from '@/components/admin/SizePackPhotos';
import AppearancePhotos from '@/components/admin/AppearancePhotos';
import DescriptionPhraseEditor from '@/components/admin/DescriptionPhraseEditor';
import EntityDatasheetLabelEditor from '@/components/admin/EntityDatasheetLabelEditor';
import { adminFetchJson } from '@/lib/admin-fetch';
import { productMatchesSize } from '@shared/series-options';
import { parseDatasheetLabels, type DatasheetLabel } from '@shared/datasheet-labels';
import { APPEARANCE_NA, isAppearanceNa, isAppearanceKind, type AppearancePhotoDto } from '@shared/appearance-photos';
import { PHRASE_PLACEHOLDER_FIELDS } from '@shared/description-phrase';
import { asStrapiEntity } from '@/lib/strapi-entity';
import {
  groupCatalogByKind,
  groupOptionsByKind,
  lookupCatalogCode,
  optionText,
  valuesEqual,
  variantKindLabel,
  variantSpecFields,
  SIZE_KIND,
  type SeriesOptionDto,
  type VariantCatalogOption,
} from '@shared/series-options';

type DraftOption = {
  value: string;
  code: string;
  lumen: string;
  system_lumen: string;
  dimensions: string;
  cutout_size: string;
  packId?: number;
  main_image_A?: string;
  main_image_B?: string;
  size_image?: string;
};

function emptyDraft(patch?: Partial<DraftOption>): DraftOption {
  return {
    value: '',
    code: '',
    lumen: '',
    system_lumen: '',
    dimensions: '',
    cutout_size: '',
    ...patch,
  };
}

function draftsFromOptions(
  options: SeriesOptionDto[],
  catalog: VariantCatalogOption[],
  products: Array<{ id: number; attributes?: Record<string, unknown> }>
): Record<string, DraftOption[]> {
  const grouped = groupOptionsByKind(options);
  const drafts: Record<string, DraftOption[]> = {};
  for (const field of variantSpecFields()) {
    drafts[field.key] = (grouped[field.key] || []).map((option) => {
      const pack =
        field.key === SIZE_KIND
          ? products.find((product) =>
              productMatchesSize(
                {
                  ...(product.attributes || {}),
                  dimensions: product.attributes?.dimensions,
                  cutout_size: product.attributes?.cutout_size,
                },
                option
              )
            )
          : undefined;
      return {
        value: option.value || '',
        code: lookupCatalogCode(catalog, field.key, option.value),
        lumen: option.lumen != null ? String(option.lumen) : '',
        system_lumen: option.system_lumen != null ? String(option.system_lumen) : '',
        dimensions: option.dimensions || '',
        cutout_size: option.cutout_size || '',
        packId: pack?.id,
        main_image_A: String(pack?.attributes?.main_image_A || ''),
        main_image_B: String(pack?.attributes?.main_image_B || ''),
        size_image: String(pack?.attributes?.size_image || ''),
      };
    });
    if (!drafts[field.key].length) drafts[field.key] = [];
  }
  return drafts;
}

function flattenDrafts(drafts: Record<string, DraftOption[]>): SeriesOptionDto[] {
  const out: SeriesOptionDto[] = [];
  let sort = 0;
  for (const field of variantSpecFields()) {
    for (const row of drafts[field.key] || []) {
      const value =
        field.key === SIZE_KIND
          ? optionText(row.value) || optionText(row.dimensions)
          : optionText(row.value);
      if (!value) continue;
      out.push({
        kind: field.key,
        value,
        sort_order: sort,
        lumen: field.key === 'wattage' && row.lumen && Number.isFinite(Number(row.lumen)) ? Number(row.lumen) : null,
        system_lumen:
          field.key === 'wattage' && row.system_lumen && Number.isFinite(Number(row.system_lumen))
            ? Number(row.system_lumen)
            : null,
        dimensions: field.key === SIZE_KIND ? optionText(row.dimensions) || value : null,
        cutout_size: field.key === SIZE_KIND ? optionText(row.cutout_size) || null : null,
        code: optionText(row.code) || null,
      });
      sort += 1;
    }
  }
  return out;
}

function tagLabel(option: { value: string; code?: string }): string {
  return option.code ? `${option.value} · ${option.code}` : option.value;
}

export default function SeriesVariantEditorPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionPhrase, setDescriptionPhrase] = useState('');
  const [typeId, setTypeId] = useState<number>(0);
  const [typeName, setTypeName] = useState('');
  const [ldtFamily, setLdtFamily] = useState('');
  const [productCode, setProductCode] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, DraftOption[]>>({});
  const [catalog, setCatalog] = useState<VariantCatalogOption[]>([]);
  const [datasheetLabels, setDatasheetLabels] = useState<DatasheetLabel[]>([]);
  const [appearancePhotos, setAppearancePhotos] = useState<AppearancePhotoDto[]>([]);
  const [generateTick, setGenerateTick] = useState(0);
  const [uploadedMainA, setUploadedMainA] = useState('');
  const [uploadedSourceId, setUploadedSourceId] = useState<number | undefined>();

  async function load() {
    setLoading(true);
    setError(null);
    const [seriesResult, catalogResult] = await Promise.all([
      adminFetchJson<{ data?: unknown }>(`/product-series/${id}`),
      adminFetchJson<{ data?: VariantCatalogOption[] }>('/variant-options'),
    ]);
    setLoading(false);
    if (!seriesResult.ok) {
      setError(seriesResult.error);
      return;
    }
    const loadedCatalog = catalogResult.ok && Array.isArray(catalogResult.data?.data) ? catalogResult.data.data : [];
    setCatalog(loadedCatalog);
    const entity = asStrapiEntity(seriesResult.data?.data ?? seriesResult.data);
    const attrs = (entity?.attributes || {}) as Record<string, unknown>;
    setName(String(attrs.name || ''));
    setSlug(String(attrs.slug || ''));
    setDescription(String(attrs.description || ''));
    setDescriptionPhrase(String(attrs.description_phrase || ''));
    setTypeId(Number(attrs.product_type_id || (attrs.product_type as { data?: { id?: number } })?.data?.id) || 0);
    const nestedType = attrs.product_type as {
      data?: { attributes?: { name?: string } };
    } | undefined;
    setTypeName(String(nestedType?.data?.attributes?.name || ''));
    setDatasheetLabels(parseDatasheetLabels(attrs.datasheet_labels));
    setLdtFamily(String(attrs.ldt_family || ''));
    setProductCode(String(attrs.product_code || ''));
    setIsFeatured(Boolean(attrs.is_featured));
    const products = Array.isArray((attrs.products as { data?: unknown[] })?.data)
      ? ((attrs.products as { data: Array<{ id: number; attributes?: Record<string, unknown> }> }).data)
      : [];
    const nextDrafts = draftsFromOptions(
      Array.isArray(attrs.options) ? (attrs.options as SeriesOptionDto[]) : [],
      loadedCatalog,
      products
    );
    setDrafts(nextDrafts);
    setAppearancePhotos(
      Array.isArray(attrs.appearance_photos) ? (attrs.appearance_photos as AppearancePhotoDto[]) : []
    );
  }

  useEffect(() => {
    if (Number.isInteger(id) && id > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fields = useMemo(() => variantSpecFields(), []);
  const catalogByKind = useMemo(() => groupCatalogByKind(catalog), [catalog]);
  const phraseFields = useMemo(() => {
    return PHRASE_PLACEHOLDER_FIELDS.map((field) => {
      let values: string[] = [];
      if (field.key === 'lumen' || field.key === 'source_lumen') {
        values = (drafts.wattage || []).map((row) => optionText(row.lumen)).filter(Boolean);
      } else if (field.key === 'system_lumen') {
        values = (drafts.wattage || []).map((row) => optionText(row.system_lumen)).filter(Boolean);
      } else if (field.key === 'dimensions') {
        values = (drafts[SIZE_KIND] || []).map((row) => optionText(row.dimensions) || optionText(row.value)).filter(Boolean);
      } else if (field.key === 'cutout_size') {
        values = (drafts[SIZE_KIND] || []).map((row) => optionText(row.cutout_size)).filter(Boolean);
      } else {
        values = (drafts[field.key] || []).map((row) => optionText(row.value)).filter(Boolean);
      }
      return { key: field.key, label: field.label, values: [...new Set(values)] };
    }).filter((field) => field.values.length);
  }, [drafts]);

  function selectedIndex(kind: string, value: string): number {
    return (drafts[kind] || []).findIndex((row) => valuesEqual(kind, row.value, value));
  }

  function toggleTag(kind: string, option: { value: string; code?: string }) {
    const value = optionText(option.value);
    if (!value) return;
    setDrafts((prev) => {
      const list = [...(prev[kind] || [])];
      const index = list.findIndex((row) => valuesEqual(kind, row.value, value));
      if (index >= 0) {
        return { ...prev, [kind]: list.filter((_, i) => i !== index) };
      }
      const next = isAppearanceKind(kind)
        ? list.filter((row) => !isAppearanceNa(row.value))
        : list;
      return {
        ...prev,
        [kind]: [...next, emptyDraft({ value, code: optionText(option.code) })],
      };
    });
  }

  function toggleAppearanceNa(kind: string) {
    setDrafts((prev) => {
      const list = prev[kind] || [];
      const hasNa = list.some((row) => isAppearanceNa(row.value));
      if (hasNa) return { ...prev, [kind]: list.filter((row) => !isAppearanceNa(row.value)) };
      return { ...prev, [kind]: [emptyDraft({ value: APPEARANCE_NA })] };
    });
  }

  function updateRow(kind: string, index: number, patch: Partial<DraftOption>) {
    setDrafts((prev) => {
      const list = [...(prev[kind] || [])];
      list[index] = { ...list[index], ...patch };
      return { ...prev, [kind]: list };
    });
  }

  function tagsForKind(kind: string): Array<{ value: string; code: string; selected: boolean }> {
    const catalogRows = catalogByKind[kind] || [];
    const selected = drafts[kind] || [];
    const seen = new Set<string>();
    const tags: Array<{ value: string; code: string; selected: boolean }> = [];
    for (const option of catalogRows) {
      if (isAppearanceNa(option.value)) continue;
      const key = option.value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push({
        value: option.value,
        code: option.code || '',
        selected: selectedIndex(kind, option.value) >= 0,
      });
    }
    for (const row of selected) {
      if (isAppearanceNa(row.value)) continue;
      const already = tags.some((tag) => valuesEqual(kind, tag.value, row.value));
      if (already) continue;
      tags.push({ value: row.value, code: row.code || '', selected: true });
    }
    return tags;
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await adminFetchJson(`/product-series/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug,
        description,
        description_phrase: descriptionPhrase,
        product_type_id: typeId || null,
        ldt_family: ldtFamily || null,
        product_code: productCode || null,
        is_featured: isFeatured,
        options: flattenDrafts(drafts),
      }),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess('Variants saved.');
    await load();
  }

  if (!Number.isInteger(id) || id <= 0) {
    return <AlertBanner variant="error">Invalid series.</AlertBanner>;
  }

  return (
    <div>
      <AdminPageHeader
        title={name ? `${name} variants` : 'Series variants'}
        backHref="/admin/product-series"
        backLabel="Back to series"
        backHelpKey="admin.product_series.back_list"
        actions={
          <div className="flex items-center gap-3">
            <Button helpKey="admin.dash.link.variant_options" variant="ghost" href="/admin/variant-options">
              Variant
            </Button>
            <Button helpKey="admin.product_series.save_variants" onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save variants'}
            </Button>
          </div>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}
      {loading ? <p className="text-gray-500">Loading series…</p> : null}

      {!loading ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Extra datasheet icons are created on Variant, then picked here as tags. IP, warranty, and
            voltage still fill from the variant when those specs are set.
          </p>
          <div className="bg-white shadow-md rounded p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextInput label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <div className="md:col-span-2">
              <label className="admin-field-label">Description</label>
              <textarea className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <DescriptionPhraseEditor
              value={descriptionPhrase}
              onChange={setDescriptionPhrase}
              seriesName={name}
              typeName={typeName}
              fields={phraseFields}
            />
            <TextInput
              label="Model code"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              hint="Printed as the datasheet model (for example DL00001)."
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                data-help-key="admin.product_series.featured"
              />
              Featured on homepage
            </label>
            <SelectField
              label="LDT shape"
              value={ldtFamily}
              onChange={(e) => setLdtFamily(e.target.value)}
              data-help-key="admin.product_series.ldt_family"
              hint={
                <HelpButton
                  helpKey="admin.product_series.ldt_family"
                  type="button"
                  className="text-xs text-gray-500"
                >
                  Circular (spot / downlight) or linear (strip / batten) for custom series LDT files.
                </HelpButton>
              }
            >
              <option value="">Recommend from specs</option>
              <option value="circular">Circular</option>
              <option value="linear">Linear</option>
            </SelectField>
          </div>

          <EntityDatasheetLabelEditor
            catalog={catalog}
            labels={datasheetLabels}
            description="Extra squares for this series. Create icons on Variant, then click a tag here to add it."
            onSave={async (next) => {
              const result = await adminFetchJson(`/product-series/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datasheet_labels: next }),
              });
              if (!result.ok) throw new Error(result.error);
              setDatasheetLabels(next);
            }}
          />

          <div className="space-y-8 mb-8">
            {fields.map((field) => {
              const rows = drafts[field.key] || [];
              const tags = tagsForKind(field.key);
              return (
                <Fragment key={field.key}>
                <div className="bg-white shadow-md rounded p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">{variantKindLabel(field.key)}</h2>
                    {field.key === SIZE_KIND ? (
                      <Button
                        helpKey="admin.product_series.option_add"
                        variant="secondary"
                        onClick={() =>
                          setDrafts((prev) => ({
                            ...prev,
                            [field.key]: [...(prev[field.key] || []), emptyDraft()],
                          }))
                        }
                      >
                        Add size
                      </Button>
                    ) : null}
                  </div>
                  {field.key === SIZE_KIND ? (
                    rows.length === 0 ? (
                      <p className="text-sm text-gray-500">No sizes yet. Add a label, dimensions, and cutout for this series.</p>
                    ) : (
                      <div className="space-y-6">
                        {rows.map((row, index) => (
                          <div
                            key={`${field.key}-${index}`}
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border border-gray-100 rounded p-3"
                          >
                            <div className="md:col-span-3">
                              <TextInput
                                label="Label"
                                value={row.value}
                                onChange={(e) => updateRow(field.key, index, { value: e.target.value })}
                                placeholder="Ø90mm"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <TextInput
                                label="Dimensions"
                                value={row.dimensions}
                                onChange={(e) => updateRow(field.key, index, { dimensions: e.target.value })}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <TextInput
                                label="Cutout"
                                value={row.cutout_size}
                                onChange={(e) => updateRow(field.key, index, { cutout_size: e.target.value })}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <Button
                                helpKey="admin.product_series.option_remove"
                                variant="danger"
                                onClick={() =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [field.key]: (prev[field.key] || []).filter((_, i) => i !== index),
                                  }))
                                }
                              >
                                Remove
                              </Button>
                            </div>
                            <SizePackPhotos
                              productId={row.packId}
                              seriesSlug={slug}
                              images={{
                                main_image_A: row.main_image_A,
                                main_image_B: row.main_image_B,
                                size_image: row.size_image,
                              }}
                              size={optionText(row.dimensions) || optionText(row.value)}
                              cuthole={optionText(row.cutout_size)}
                              mounting={(drafts.mounting_type || [])
                                .map((item) => optionText(item.value))
                                .filter(Boolean)
                                .join(', ')}
                              onChanged={load}
                              onMainAUploaded={({ productId, imagePath }) => {
                                setUploadedMainA(imagePath);
                                setUploadedSourceId(productId);
                                setGenerateTick((tick) => tick + 1);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  ) : tags.length === 0 && !isAppearanceKind(field.key) ? (
                    <p className="text-sm text-gray-500">
                      No options yet.{' '}
                      <Button
                        helpKey="admin.dash.link.variant_options"
                        variant="ghost"
                        href="/admin/variant-options"
                        className="text-blue-600 hover:underline"
                      >
                        Add them on Variant
                      </Button>
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {isAppearanceKind(field.key) ? (
                        <OptionTag
                          helpKey="admin.product_series.appearance_na"
                          selected={(drafts[field.key] || []).some((row) => isAppearanceNa(row.value))}
                          onClick={() => toggleAppearanceNa(field.key)}
                        >
                          N/A
                        </OptionTag>
                      ) : null}
                      {tags.map((tag) => (
                        <OptionTag
                          key={`${field.key}-${tag.value}`}
                          helpKey={tag.selected ? 'admin.product_series.option_remove' : 'admin.product_series.option_pick'}
                          selected={tag.selected}
                          onClick={() => toggleTag(field.key, tag)}
                        >
                          {tagLabel(tag)}
                        </OptionTag>
                      ))}
                    </div>
                  )}

                  {isAppearanceKind(field.key) && tags.length === 0 ? (
                    <p className="text-sm text-gray-500 mt-3">
                      No catalog values yet.{' '}
                      <Button
                        helpKey="admin.dash.link.variant_options"
                        variant="ghost"
                        href="/admin/variant-options"
                        className="text-blue-600 hover:underline"
                      >
                        Add them on Variant
                      </Button>
                      {' '}or set N/A if this series has no {variantKindLabel(field.key).toLowerCase()}.
                    </p>
                  ) : null}

                  {field.key === 'wattage'
                    ? rows.map((row, index) => (
                        <div
                          key={`${field.key}-extra-${index}`}
                          className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"
                        >
                          <TextInput
                            label={`${row.value || 'Wattage'} source lumen`}
                            value={row.lumen}
                            onChange={(e) => updateRow(field.key, index, { lumen: e.target.value })}
                          />
                          <TextInput
                            label="System lumen"
                            value={row.system_lumen}
                            onChange={(e) => updateRow(field.key, index, { system_lumen: e.target.value })}
                          />
                        </div>
                      ))
                    : null}
                </div>
                {field.key === SIZE_KIND ? (
                  <AppearancePhotos
                    seriesId={id}
                    seriesSlug={slug}
                    options={flattenDrafts(drafts)}
                    photos={appearancePhotos}
                    sourceImageUrl={
                      uploadedMainA ||
                      (drafts[SIZE_KIND] || []).map((row) => optionText(row.main_image_A)).find(Boolean) ||
                      ''
                    }
                    sourceProductId={
                      uploadedSourceId ||
                      (drafts[SIZE_KIND] || []).find((row) => optionText(row.main_image_A))?.packId
                    }
                    generateTick={generateTick}
                    onPhotosChange={setAppearancePhotos}
                  />
                ) : null}
                </Fragment>
              );
            })}
          </div>

          <PartnerImportPanel
            lockedTypeId={typeId || undefined}
            lockedSeriesId={id}
            onImported={load}
          />
        </>
      ) : null}
    </div>
  );
}

'use client';

import { FormEvent, RefObject, useState } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TextInput, SelectField, TextareaField } from '@/components/ui/FormField';
import SpecificationsEditor, {
  SpecPair,
  recordToSpecPairs,
  specPairsToRecord,
} from '@/components/admin/SpecificationsEditor';
import { AdminSeriesOption, AdminTypeOption, DIMMING_OPTIONS, NewProductDraft } from './types';

export default function ProductCreateForm({
  product,
  onChange,
  productTypes,
  productSeries,
  featuredImageRef,
  additionalImagesRef,
  featuredImagePreview,
  additionalImagesPreview,
  onFeaturedImageChange,
  onAdditionalImagesChange,
  onGenerateSlug,
  onNameChange,
  onSubmit,
}: {
  product: NewProductDraft;
  onChange: (next: NewProductDraft) => void;
  productTypes: AdminTypeOption[];
  productSeries: AdminSeriesOption[];
  featuredImageRef: RefObject<HTMLInputElement | null>;
  additionalImagesRef: RefObject<HTMLInputElement | null>;
  featuredImagePreview: string | null;
  additionalImagesPreview: string[];
  onFeaturedImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdditionalImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateSlug: () => void;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent, draft: NewProductDraft) => void;
}) {
  const [specRows, setSpecRows] = useState<SpecPair[]>(() => recordToSpecPairs(product.specifications));
  const patch = (partial: Partial<NewProductDraft>) => onChange({ ...product, ...partial });
  const seriesSelectOptions = product.product_type_id
    ? productSeries.filter((row) => row.attributes.product_type_id === product.product_type_id)
    : [];

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Create New Product</h2>
      <form
        onSubmit={(e) => onSubmit(e, { ...product, specifications: specPairsToRecord(specRows) })}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TextInput label="Name *" value={product.name} onChange={onNameChange} required />
          <TextInput
            label="Slug *"
            value={product.slug}
            onChange={(e) => patch({ slug: e.target.value })}
            required
            hint={
              <Button helpKey="admin.products.generate_slug" variant="ghost" type="button" onClick={onGenerateSlug}>
                Generate
              </Button>
            }
          />
          <SelectField
            label="Product type *"
            value={product.product_type_id || ''}
            required
            onChange={(e) => {
              const typeId = Number(e.target.value);
              const next = { ...product, product_type_id: typeId };
              if (typeId && product.series_id) {
                const series = productSeries.find((row) => row.id === product.series_id);
                if (series && series.attributes.product_type_id !== typeId) {
                  next.series_id = 0;
                }
              }
              onChange(next);
            }}
          >
            <option value="">Select a product type</option>
            {productTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.attributes.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Series *"
            value={product.series_id || ''}
            required
            disabled={!product.product_type_id}
            onChange={(e) => {
              const seriesId = Number(e.target.value);
              const series = productSeries.find((row) => row.id === seriesId);
              patch({
                series_id: seriesId,
                product_type_id: series?.attributes.product_type_id || product.product_type_id,
              });
            }}
          >
            <option value="">{!product.product_type_id ? 'Select a product type first' : 'Select a series'}</option>
            {seriesSelectOptions.map((series) => (
              <option key={series.id} value={series.id}>
                {series.attributes.name}
              </option>
            ))}
          </SelectField>
          <TextInput
            label="Wattage"
            type="number"
            value={product.wattage}
            onChange={(e) => patch({ wattage: Number(e.target.value) })}
          />
          <TextInput
            label="Source Lumen"
            type="number"
            value={product.lumen}
            placeholder="e.g. 1200"
            onChange={(e) => patch({ lumen: Number(e.target.value) })}
          />
          <TextInput
            label="CCT"
            value={product.cct}
            placeholder="e.g. 3000K"
            onChange={(e) => patch({ cct: e.target.value })}
          />
          <TextInput
            label="Beam Angle"
            value={product.beam_angle}
            placeholder="e.g. 60°"
            onChange={(e) => patch({ beam_angle: e.target.value })}
          />
          <SelectField
            label="Dimming"
            value={product.dimming}
            onChange={(e) => patch({ dimming: e.target.value })}
          >
            {DIMMING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={product.is_featured}
              onChange={(e) => patch({ is_featured: e.target.checked })}
              className="mr-2"
              id="is_featured"
            />
            <label htmlFor="is_featured" className="text-gray-700">
              Featured Product
            </label>
          </div>
          <div>
            <label className="admin-field-label">Featured Image *</label>
            <input
              type="file"
              ref={featuredImageRef}
              onChange={onFeaturedImageChange}
              accept="image/*"
              className="input-field"
              required
            />
            {featuredImagePreview ? (
              <div className="mt-2 relative h-40 w-40 border border-gray-300">
                <Image src={featuredImagePreview} alt="Featured image preview" fill className="object-contain" />
              </div>
            ) : null}
          </div>
          <div>
            <label className="admin-field-label">Additional Images</label>
            <input
              type="file"
              ref={additionalImagesRef}
              onChange={onAdditionalImagesChange}
              accept="image/*"
              multiple
              className="input-field"
            />
            {additionalImagesPreview.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {additionalImagesPreview.map((src, index) => (
                  <div key={index} className="relative h-20 w-20 border border-gray-300">
                    <Image src={src} alt={`Additional image ${index + 1}`} fill className="object-contain" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <TextareaField
          label="Description"
          value={product.description}
          onChange={(e) => patch({ description: e.target.value })}
          className="mb-6"
        />
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Specifications</h3>
          <SpecificationsEditor specs={specRows} onChange={setSpecRows} helpKeyPrefix="admin.products" />
        </div>
        <div className="flex justify-end">
          <Button helpKey="admin.products.create" type="submit">
            Create Product
          </Button>
        </div>
      </form>
    </Card>
  );
}

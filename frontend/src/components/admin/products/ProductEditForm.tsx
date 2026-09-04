'use client';

import { FormEvent, RefObject, useState } from 'react';
import Image from 'next/image';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TextInput, SelectField, TextareaField } from '@/components/ui/FormField';
import SpecificationsEditor, {
  SpecPair,
  recordToSpecPairs,
  specPairsToRecord,
} from '@/components/admin/SpecificationsEditor';
import { AdminSeriesOption, AdminTypeOption, DIMMING_OPTIONS } from './types';

export type EditableProduct = {
  id: number;
  attributes: {
    name: string;
    description: string;
    slug: string;
    wattage: number;
    lumen?: number;
    cct: string;
    beam_angle: string;
    dimming: string;
    is_featured: boolean;
    series_id?: number | null;
    product_type_id?: number | null;
    specifications: Record<string, string>;
    images?: { data?: Array<{ id: number; attributes: { url: string } }> };
  };
};

export default function ProductEditForm({
  product,
  onChange,
  productTypes,
  productSeries,
  featuredImageRef,
  additionalImagesRef,
  featuredImagePreview,
  additionalImagesPreview,
  existingImageSrc,
  resolveImageUrl,
  onFeaturedImageChange,
  onAdditionalImagesChange,
  onCancel,
  onSubmit,
}: {
  product: EditableProduct;
  onChange: (next: EditableProduct) => void;
  productTypes: AdminTypeOption[];
  productSeries: AdminSeriesOption[];
  featuredImageRef: RefObject<HTMLInputElement | null>;
  additionalImagesRef: RefObject<HTMLInputElement | null>;
  featuredImagePreview: string | null;
  additionalImagesPreview: string[];
  existingImageSrc: string | null;
  resolveImageUrl: (url: string | null | undefined) => string;
  onFeaturedImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdditionalImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent, next: EditableProduct) => void;
}) {
  const [specRows, setSpecRows] = useState<SpecPair[]>(() =>
    recordToSpecPairs(product.attributes.specifications)
  );
  const attrs = product.attributes;
  const seriesSelectOptions = attrs.product_type_id
    ? productSeries.filter((row) => row.attributes.product_type_id === attrs.product_type_id)
    : productSeries;
  const patchAttrs = (partial: Partial<EditableProduct['attributes']>) =>
    onChange({ ...product, attributes: { ...attrs, ...partial } });

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Edit Product</h2>
      <form
        onSubmit={(e) =>
          onSubmit(e, {
            ...product,
            attributes: { ...attrs, specifications: specPairsToRecord(specRows) },
          })
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TextInput
            label="Name *"
            value={attrs.name}
            required
            onChange={(e) => patchAttrs({ name: e.target.value })}
          />
          <TextInput
            label="Slug *"
            value={attrs.slug}
            required
            onChange={(e) => patchAttrs({ slug: e.target.value })}
          />
          <SelectField
            label="Product type *"
            value={attrs.product_type_id || ''}
            required
            onChange={(e) => {
              const typeId = Number(e.target.value) || null;
              const series = productSeries.find((row) => row.id === attrs.series_id);
              patchAttrs({
                product_type_id: typeId,
                series_id:
                  typeId && attrs.series_id && series && series.attributes.product_type_id !== typeId
                    ? null
                    : attrs.series_id,
              });
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
            value={attrs.series_id || ''}
            required
            onChange={(e) => {
              const seriesId = Number(e.target.value) || null;
              const series = seriesId ? productSeries.find((row) => row.id === seriesId) : undefined;
              patchAttrs({
                series_id: seriesId,
                product_type_id: series?.attributes.product_type_id || attrs.product_type_id,
              });
            }}
          >
            <option value="">{attrs.product_type_id ? 'Select a series' : 'Select a product type first'}</option>
            {seriesSelectOptions.map((series) => (
              <option key={series.id} value={series.id}>
                {series.attributes.name}
              </option>
            ))}
          </SelectField>
          <TextInput
            label="Wattage"
            type="number"
            value={attrs.wattage}
            onChange={(e) => patchAttrs({ wattage: Number(e.target.value) })}
          />
          <TextInput
            label="Source Lumen"
            type="number"
            value={attrs.lumen || 0}
            placeholder="e.g. 1200"
            onChange={(e) => patchAttrs({ lumen: Number(e.target.value) || 0 })}
          />
          <TextInput
            label="CCT"
            value={attrs.cct}
            placeholder="e.g. 3000K"
            onChange={(e) => patchAttrs({ cct: e.target.value })}
          />
          <TextInput
            label="Beam Angle"
            value={attrs.beam_angle}
            placeholder="e.g. 60°"
            onChange={(e) => patchAttrs({ beam_angle: e.target.value })}
          />
          <SelectField
            label="Dimming"
            value={attrs.dimming}
            onChange={(e) => patchAttrs({ dimming: e.target.value })}
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
              checked={attrs.is_featured}
              onChange={(e) => patchAttrs({ is_featured: e.target.checked })}
              className="mr-2"
              id="edit_is_featured"
            />
            <label htmlFor="edit_is_featured" className="text-gray-700">
              Featured Product
            </label>
          </div>
          <div>
            <label className="admin-field-label">Featured Image</label>
            <input
              type="file"
              ref={featuredImageRef}
              onChange={onFeaturedImageChange}
              accept="image/*"
              className="input-field"
            />
            {featuredImagePreview || existingImageSrc ? (
              <AdminHoverPreview src={featuredImagePreview || resolveImageUrl(existingImageSrc)} className="mt-2 w-40">
              <div className="relative h-40 w-40 border border-gray-300">
                <Image
                  src={featuredImagePreview || resolveImageUrl(existingImageSrc)}
                  alt="Featured image"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                  }}
                />
              </div>
              </AdminHoverPreview>
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
            {!additionalImagesPreview.length && attrs.images?.data ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {attrs.images.data.map((img, index) => (
                  <div key={img.id} className="relative">
                    <AdminHoverPreview src={resolveImageUrl(img.attributes.url)}>
                    <div className="relative h-20 w-20 border border-gray-300">
                    <Image
                      src={resolveImageUrl(img.attributes.url)}
                      alt={`Product image ${index + 1}`}
                      fill
                      className="object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                      }}
                    />
                    </div>
                    </AdminHoverPreview>
                  </div>
                ))}
              </div>
            ) : null}
            {additionalImagesPreview.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {additionalImagesPreview.map((src, index) => (
                  <AdminHoverPreview key={index} src={src}>
                  <div className="relative h-20 w-20 border border-gray-300">
                    <Image src={src} alt={`New additional image ${index + 1}`} fill className="object-contain" />
                  </div>
                  </AdminHoverPreview>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <TextareaField
          label="Description"
          value={attrs.description}
          onChange={(e) => patchAttrs({ description: e.target.value })}
          className="mb-6"
        />
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Specifications</h3>
          <SpecificationsEditor specs={specRows} onChange={setSpecRows} helpKeyPrefix="admin.products" />
        </div>
        <div className="flex justify-end gap-2">
          <Button helpKey="admin.products.cancel_edit" variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button helpKey="admin.products.update" type="submit">
            Update Product
          </Button>
        </div>
      </form>
    </Card>
  );
}

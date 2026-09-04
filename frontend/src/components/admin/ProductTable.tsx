'use client';

import Pagination from '@/components/ui/Pagination';
import { HelpLink } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { ReactNode } from 'react';

export type ListProduct = {
  id: number;
  attributes: {
    slug?: string;
    wattage?: number;
    lumen?: number | string | null;
    cct?: string;
    beam_angle?: string;
    dimming?: string;
    is_featured?: boolean;
    series_id?: number | null;
  };
};

export default function ProductTable<T extends ListProduct>({
  loading,
  products,
  pagedProducts,
  listPage,
  listTotalPages,
  onPageChange,
  renderImage,
  slugLabel,
  typeLabel,
  seriesLabel,
  onDuplicate,
  onDelete,
}: {
  loading: boolean;
  products: T[];
  pagedProducts: T[];
  listPage: number;
  listTotalPages: number;
  onPageChange: (page: number) => void;
  renderImage: (product: T) => ReactNode;
  slugLabel: (product: T) => string;
  typeLabel: (product: T) => string;
  seriesLabel: (product: T) => string;
  onDuplicate: (product: T) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Image', 'Slug', 'Type', 'Series', 'Wattage', 'Source Lumen', 'CCT', 'Beam Angle', 'Dimming', 'Featured', 'Actions'].map(
              (col) => (
                <th
                  key={col}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={11} className="px-6 py-4 text-center">
                Loading products...
              </td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-6 py-4 text-center">
                No products found.
              </td>
            </tr>
          ) : (
            pagedProducts.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative h-16 w-16">{renderImage(product)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <HelpLink
                    href={`/admin/products/${product.id}`}
                    helpKey="admin.products.open_edit"
                    title="Open product editor"
                    className="text-sm font-medium hover:underline"
                  >
                    {slugLabel(product)}
                  </HelpLink>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeLabel(product)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seriesLabel(product)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.attributes.wattage}W</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.attributes.lumen || '-'} lm</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.attributes.cct}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.attributes.beam_angle}°</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.attributes.dimming}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.attributes.is_featured ? 'Yes' : 'No'}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <Button helpKey="admin.products.duplicate" variant="secondary" onClick={() => onDuplicate(product)}>
                      Duplicate
                    </Button>
                    <Button helpKey="admin.products.delete" variant="danger" onClick={() => onDelete(product.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!loading && products.length > 0 ? (
        <div className="px-4 pb-4">
          <Pagination
            page={listPage}
            totalPages={listTotalPages}
            onPageChange={onPageChange}
            helpKey="admin.products.list_page"
            summary={`${products.length} product${products.length === 1 ? '' : 's'} · page ${listPage} of ${listTotalPages}`}
          />
        </div>
      ) : null}
    </div>
  );
}

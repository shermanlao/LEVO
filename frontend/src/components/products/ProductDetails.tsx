'use client';

import React from 'react';
import { getDatasheetUrl, getInstallationUrl } from '@/lib/sqlite-api';
import { HelpLink } from '@/components/admin/HelpButton';
import {
  collectPhysicalRows,
  collectTechnicalRows,
} from '@/lib/product-specs';
import ImageCarousel from './ImageCarousel';
import ProductLdtDownload from './ProductLdtDownload';
import { FileDownloadIcon, InstallationIcon } from './ProductFileIcons';

interface ProductDetailsProps {
  product: any;
  headingLevel?: 'h1' | 'h2';
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product, headingLevel = 'h1' }) => {
  if (!product || !product.attributes) {
    return (
      <div className="p-4 bg-red-50 rounded border border-red-200">
        <p className="text-red-600">Product data not available</p>
      </div>
    );
  }

  const { attributes } = product;
  const datasheetUrl = attributes.slug
    ? getDatasheetUrl(attributes.slug)
    : '/api/datasheets/product';
  const technicalRows = collectTechnicalRows(attributes);
  const physicalRows = collectPhysicalRows(attributes);
  const TitleTag = headingLevel;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="w-full md:w-1/2">
          <ImageCarousel product={product} />
        </div>

        <div className="w-full md:w-1/2">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <TitleTag className="text-2xl md:text-3xl font-bold mb-2">{attributes.name}</TitleTag>
                {attributes.description ? (
                  <p className="text-base text-gray-700">{attributes.description}</p>
                ) : null}
              </div>
              <div className="text-right">
                <div className="mb-2">
                  <h3 className="text-gray-600 text-sm font-medium">Product Code</h3>
                  <p className="font-semibold">{attributes.product_code || '—'}</p>
                </div>
                <div>
                  <h3 className="text-gray-600 text-sm font-medium">Series</h3>
                  <p className="font-semibold">{attributes.series?.data?.attributes?.name || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Technical Specifications</h2>
              <div className="space-y-1">
                {technicalRows.map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-gray-600">{row.label}:</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Physical Specifications</h2>
              <div className="space-y-1">
                {physicalRows.map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-gray-600">{row.label}:</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            <HelpLink
              href={datasheetUrl}
              helpKey="catalog.datasheet.download"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center"
            >
              <FileDownloadIcon />
              Datasheet
            </HelpLink>
            {attributes.slug ? (
              <HelpLink
                href={getInstallationUrl(attributes.slug)}
                helpKey="catalog.installation.download"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center"
              >
                <InstallationIcon />
                Installation
              </HelpLink>
            ) : null}
            {product.id ? <ProductLdtDownload productId={product.id} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;

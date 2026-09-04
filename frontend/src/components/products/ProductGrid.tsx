'use client';

import { Product } from '@/types/product';
import ProductCard from './ProductCard';
import { useEffect, useState } from 'react';
import { toPublicImagePath } from '@/lib/image-utils';
import EmptyState from '@/components/ui/EmptyState';
import { catalogProductHref } from '@/lib/strapi-entity';
import { CatalogSearchParams, productMatchesFilters } from '@/lib/catalog-filters';

interface ProductGridProps {
  products: Product[];
  searchParams?: CatalogSearchParams;
  currentSeriesSlug?: string;
}

export default function ProductGrid({ products = [], searchParams = {}, currentSeriesSlug }: ProductGridProps) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products || []);

  useEffect(() => {
    if (!Array.isArray(products) || products.length === 0) {
      setFilteredProducts([]);
      return;
    }

    try {
      setFilteredProducts(products.filter((product) => productMatchesFilters(product, searchParams)));
    } catch (error) {
      console.error('Error filtering products:', error);
      setFilteredProducts(products);
    }
  }, [products, searchParams]);

  if (!Array.isArray(filteredProducts) || filteredProducts.length === 0) {
    return (
      <EmptyState>
        <p>No products match your filters or no products are available.</p>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <p className="text-gray-600">
          Showing {filteredProducts.length} products
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product, index) => {
          // Skip invalid products
          if (!product || !product.id || !product.attributes) {
            return null;
          }
          
          try {
            const href = catalogProductHref({
              ...product,
              attributes: {
                ...product.attributes,
                path: {
                  type_slug: product.attributes.path?.type_slug,
                  series_slug: product.attributes.path?.series_slug || currentSeriesSlug,
                },
              },
            });
            const imageUrl =
              toPublicImagePath(product.attributes.main_image_A) ||
              toPublicImagePath(product.attributes.featured_image) ||
              '';
            const [, , categorySlug = 'products', seriesSlug = 'general'] = href.split('/');

            return (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.attributes.name || 'Unnamed Product'}
                slug={product.attributes.slug || `product-${product.id}`}
                href={href}
                categorySlug={categorySlug}
                seriesSlug={seriesSlug}
                imageUrl={imageUrl}
                wattage={product.attributes.wattage || 0}
                cct={product.attributes.cct || ''}
                beamAngle={product.attributes.beam_angle || ''}
                priority={index < 4}
              />
            );
          } catch (error) {
            console.error('Error rendering product:', error, product);
            return null;
          }
        })}
      </div>
    </>
  );
} 
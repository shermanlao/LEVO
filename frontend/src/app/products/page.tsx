import { Metadata } from 'next';
import { getProductTypes } from '@/lib/sqlite-api';
import CategoryCard from '@/components/ui/CategoryCard';
import { asStrapiList } from '@/lib/strapi-entity';
import { toPublicImagePath } from '@/lib/image-utils';
import PageRoute from '@/components/layout/PageRoute';
import { productRouteItems } from '@/components/layout/pageRouteItems';
import { devLog } from '@/lib/dev-log';
import AlertBanner from '@/components/ui/AlertBanner';
import { ProductType } from '@/types/product';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Product Categories - LEVO Lighting',
  description: 'Browse our lighting categories and solutions.',
};

export default async function ProductCategoriesPage() {
  let productTypes: ProductType[] = [];
  let loadError: string | null = null;
  
  try {
    devLog('ProductCategoriesPage - Loading product categories');
    
    // Get all product types (categories)
    devLog('ProductCategoriesPage - Fetching product types from API');
    const productTypesResponse = await getProductTypes();
    
    // Log full API response for debugging
    devLog('API Response Structure:', JSON.stringify(productTypesResponse).slice(0, 500) + '...');
    
    productTypes = asStrapiList(productTypesResponse?.data) as ProductType[];
    
    devLog('ProductCategoriesPage - Successfully fetched product types. Count:', productTypes.length);
    
    // More detailed logging of each product type including image data
    productTypes.forEach((type: ProductType, index: number) => {
      devLog(`Product type ${index + 1}:`, {
        id: type.id,
        name: type.attributes?.name,
        slug: type.attributes?.slug,
        // Check if there's image data and log its structure
        image: type.attributes.featured_image 
          ? JSON.stringify(type.attributes.featured_image) 
          : 'No image data'
      });
    });
    
    if (productTypes.length === 0) {
      loadError = 'No product categories found in the database.';
    }
  } catch (error) {
    console.error('Error loading product categories:', error);
    productTypes = [];
    loadError = 'Could not load product categories. Check that the API and database are available.';
  }
  
  return (
    <div className="container mx-auto px-4 py-4">
      <PageRoute items={productRouteItems()} />
      {loadError && <AlertBanner>{loadError}</AlertBanner>}
      
      <h1 className="text-4xl font-bold mb-8">Product Categories</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {productTypes.map((category: ProductType) => {
          const attributes = category?.attributes;
          if (!attributes) return null;

          const imageUrl = toPublicImagePath(attributes.featured_image) || '/images/placeholder.jpg';

          return (
            <CategoryCard
              key={category.id}
              id={category.id}
              slug={attributes.slug}
              name={attributes.name}
              description={attributes.description}
              imageUrl={imageUrl}
            />
          );
        })}
      </div>
    </div>
  );
} 
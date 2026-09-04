import PageRoute from '@/components/layout/PageRoute';
import { productRouteItems } from '@/components/layout/pageRouteItems';

interface BreadcrumbProps {
  type: { slug: string; name: string };
  series: { slug: string; name: string };
  product: { slug?: string; name: string };
}

export default function Breadcrumb({ type, series, product }: BreadcrumbProps) {
  return (
    <PageRoute
      items={productRouteItems({
        type,
        series,
        product: { name: product.name },
      })}
    />
  );
}

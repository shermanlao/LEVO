import { redirect } from 'next/navigation';
import { getProductByPath } from '@/lib/sqlite-api';
import { optionText } from '@shared/series-options';

export const revalidate = 120;

interface Props {
  params: Promise<{
    type: string;
    series: string;
    slug: string;
  }>;
}

export default async function ProductPage({ params }: Props) {
  const { type, series, slug } = await params;
  const productData = await getProductByPath(type, series, slug).catch(() => null);
  const attrs = productData?.data?.attributes || {};
  const size = optionText(attrs.dimensions) || optionText(attrs.size);
  const query = size ? `?size=${encodeURIComponent(size)}` : '';
  redirect(`/products/${type}/${series}${query}`);
}

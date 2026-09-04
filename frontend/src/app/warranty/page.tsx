import ResourcePage, { generateResourceMetadata } from '@/components/layout/ResourcePage';

export const revalidate = 120;

export function generateMetadata() {
  return generateResourceMetadata('warranty');
}

export default function WarrantyPage() {
  return <ResourcePage kind="warranty" />;
}

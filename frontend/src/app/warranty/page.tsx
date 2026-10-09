import type { Metadata } from 'next';
import WarrantyStatement from '@/components/layout/WarrantyStatement';
import { generateResourceMetadata } from '@/components/layout/ResourcePage';

export const revalidate = 120;

export function generateMetadata(): Promise<Metadata> {
  return generateResourceMetadata('warranty');
}

export default function WarrantyPage() {
  return <WarrantyStatement />;
}

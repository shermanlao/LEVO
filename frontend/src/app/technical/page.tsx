import ResourcePage, { generateResourceMetadata } from '@/components/layout/ResourcePage';

export const revalidate = 120;

export function generateMetadata() {
  return generateResourceMetadata('technical');
}

export default function TechnicalPage() {
  return <ResourcePage kind="technical" />;
}

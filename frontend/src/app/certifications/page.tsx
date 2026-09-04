import ResourcePage, { generateResourceMetadata } from '@/components/layout/ResourcePage';

export const revalidate = 120;

export function generateMetadata() {
  return generateResourceMetadata('certifications');
}

export default function CertificationsPage() {
  return <ResourcePage kind="certifications" />;
}

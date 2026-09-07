'use client';

import { usePathname } from 'next/navigation';
import UnderConstruction from '@/components/layout/UnderConstruction';

function isAdminAppPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default function PublicCatalogGate({
  hidePublicCatalog,
  children,
}: {
  hidePublicCatalog: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  if (hidePublicCatalog && !isAdminAppPath(pathname)) {
    return <UnderConstruction />;
  }
  return children;
}

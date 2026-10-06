'use client';

import { usePathname } from 'next/navigation';
import UnderConstruction from '@/components/layout/UnderConstruction';
import { useAdminMe } from '@/lib/use-admin-me';

function isAdminAppPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default function PublicCatalogGate({
  constructionOn,
  children,
}: {
  constructionOn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  const { session } = useAdminMe();
  const staff = session === 'ok';
  if (constructionOn && !isAdminAppPath(pathname) && !staff) {
    return <UnderConstruction />;
  }
  return children;
}

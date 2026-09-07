'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { pageKeyForAdminPath, roleCanOpenPage } from '@shared/admin-roles';
import { useAdminMe } from '@/lib/use-admin-me';

export default function AdminPageGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { me, loading } = useAdminMe();
  const page = pageKeyForAdminPath(pathname);
  const login = pathname === '/admin/login' || pathname.startsWith('/admin/login/');
  const allowed = !page || !me || roleCanOpenPage(me.role, page, me.pages);

  useEffect(() => {
    if (login || loading || allowed) return;
    router.replace('/admin');
  }, [allowed, loading, login, router]);

  if (login) return children;
  if (!loading && !allowed) return null;
  return children;
}

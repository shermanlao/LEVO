'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { pageKeyForAdminPath, roleCanOpenPage } from '@shared/admin-roles';
import { adminLoginHref } from '@/lib/admin-session';
import { useAdminMe } from '@/lib/use-admin-me';

export default function AdminPageGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { me, loading, session } = useAdminMe();
  const page = pageKeyForAdminPath(pathname);
  const login = pathname === '/admin/login' || pathname.startsWith('/admin/login/');
  const pageDenied = Boolean(me && page && !roleCanOpenPage(me.role, page, me.pages));

  useEffect(() => {
    if (login || loading) return;
    if (session === 'unauthorized') {
      router.replace(adminLoginHref(pathname));
      return;
    }
    if (pageDenied) router.replace('/admin');
  }, [loading, login, pageDenied, pathname, router, session]);

  if (login) return children;
  if (loading) return children;
  if (session === 'unauthorized' || pageDenied) return null;
  return children;
}

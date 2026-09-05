'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function HeaderAuthButton() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((response) => {
        if (!cancelled) setSignedIn(response.ok);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!signedIn) {
    if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
      return null;
    }
    return (
      <Button helpKey="catalog.header.login" variant="secondary" href="/admin/login">
        Login
      </Button>
    );
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setSignedIn(false);
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      router.push('/');
    }
    router.refresh();
  }

  return (
    <Button helpKey="admin.logout" variant="secondary" onClick={logout}>
      Log out
    </Button>
  );
}

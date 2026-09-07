'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import HelpButton, { HelpLink } from '@/components/admin/HelpButton';

const ICON_CLASS = 'h-6 w-6';
const ICON_CONTROL_CLASS = 'inline-flex items-center hover:text-gray-600 bg-transparent p-0 border-0 cursor-pointer';

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

export default function HeaderAuthButton() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

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

  if (signedIn === null) {
    return null;
  }

  if (!signedIn) {
    if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
      return null;
    }
    return (
      <HelpLink
        helpKey="catalog.header.login"
        href="/admin/login"
        className={ICON_CONTROL_CLASS}
        ariaLabel="Login"
      >
        <UserIcon />
      </HelpLink>
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
    <span className="inline-flex items-center gap-3">
      <HelpLink
        helpKey="catalog.header.admin"
        href="/admin"
        className="text-xs font-semibold tracking-[0.18em] uppercase hover:text-gray-600"
      >
        Admin
      </HelpLink>
      <HelpButton
        helpKey="admin.logout"
        onClick={logout}
        className={ICON_CONTROL_CLASS}
        aria-label="Log out"
      >
        <LogoutIcon />
      </HelpButton>
    </span>
  );
}

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function postHit(body: Record<string, unknown>) {
  fetch('/api/visitors/hit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export default function VisitorBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;
    const started = Date.now();
    const query = window.location.search;
    postHit({
      path: pathname,
      query,
      referrer: document.referrer,
    });

    const sendStay = () => {
      postHit({
        path: pathname,
        query,
        duration_ms: Date.now() - started,
      });
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') sendStay();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', sendStay);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', sendStay);
      sendStay();
    };
  }, [pathname]);

  return null;
}

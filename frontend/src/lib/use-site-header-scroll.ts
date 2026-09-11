'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  SITE_HEADER_TOP_THRESHOLD,
  nextSiteHeaderScrollState,
  type SiteHeaderScrollState,
} from '@/lib/site-header-scroll';

export function useSiteHeaderScroll(pinned = false, compactAfter = SITE_HEADER_TOP_THRESHOLD) {
  const pathname = usePathname();
  const [state, setState] = useState<SiteHeaderScrollState>({ compact: false, hidden: false });
  const leaveTopAfter = Math.max(SITE_HEADER_TOP_THRESHOLD, compactAfter);
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;

  useEffect(() => {
    if (pinned) {
      setState((current) => (current.hidden ? { ...current, hidden: false } : current));
    }
  }, [pinned]);

  useEffect(() => {
    let lastY = typeof window === 'undefined' ? 0 : window.scrollY;
    let ticking = false;

    const apply = (y: number) => {
      const overlayOpen = Boolean(document.querySelector('[data-header-overlay]'));
      setState((current) =>
        nextSiteHeaderScrollState(y, lastY, current, {
          pinned: pinnedRef.current,
          overlayOpen,
          leaveTopAfter,
        }),
      );
      lastY = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        apply(window.scrollY);
        ticking = false;
      });
    };

    apply(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname, leaveTopAfter]);

  return state;
}

'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import SiteNav from '@/components/layout/SiteNav';
import Logo from '@/components/layout/Logo';
import { useSiteHeaderScroll } from '@/lib/use-site-header-scroll';

export default function Header({
  slogan,
  logoSrc,
  companyName,
  companyShortName,
}: {
  slogan?: string | null;
  logoSrc?: string | null;
  companyName?: string | null;
  companyShortName?: string | null;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const [slotHeight, setSlotHeight] = useState(84);
  const [pinned, setPinned] = useState(false);
  const { compact, hidden } = useSiteHeaderScroll(pinned);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header || hidden) return;
    setSlotHeight(header.offsetHeight);
  }, [compact, hidden, slogan, logoSrc, companyName, companyShortName]);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const offset = hidden ? 0 : header?.offsetHeight ?? 0;
    document.documentElement.style.setProperty('--site-header-offset', `${offset}px`);
    return () => {
      document.documentElement.style.removeProperty('--site-header-offset');
    };
  }, [hidden, compact]);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none transition-[height] duration-300 ease-out motion-reduce:transition-none"
        style={{ height: slotHeight }}
      />
      <header
        ref={headerRef}
        onPointerEnter={() => setPinned(true)}
        onPointerLeave={() => setPinned(false)}
        onFocusCapture={() => setPinned(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setPinned(false);
          }
        }}
        className={`site-chrome fixed inset-x-0 top-0 z-40 border-b transition-[transform,padding,box-shadow] duration-300 ease-out motion-reduce:transition-none ${
          hidden ? '-translate-y-full pointer-events-none' : 'translate-y-0'
        } ${compact ? 'py-1.5 shadow-sm' : 'py-4'}`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Logo
              slogan={slogan}
              src={logoSrc}
              companyName={companyName}
              companyShortName={companyShortName}
              compact={compact}
            />
            <SiteNav />
          </div>
        </div>
      </header>
    </>
  );
}

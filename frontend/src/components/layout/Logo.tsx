'use client';

import Image from 'next/image';
import { HelpLink } from '@/components/admin/HelpButton';

export const LEVO_LOGO_SRC = '/images/levo-logo-mark.png';

function maskUrl(src: string) {
  return `url("${src.replace(/\\/g, '/').replace(/"/g, '')}")`;
}

/** Wordmark painted with currentColor so it stays black on the light site and follows text remapping when the browser actually darkens the page. */
export function BrandLogoMark({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
}: {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  const logoSrc = String(src || '').trim() || LEVO_LOGO_SRC;
  return (
    <span
      className={`brand-logo-mark ${className}`.trim()}
      style={{ ['--brand-logo' as string]: maskUrl(logoSrc) }}
    >
      <Image
        src={logoSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="brand-logo-mark-img"
      />
    </span>
  );
}

export default function Logo({
  className = '',
  slogan,
  src,
  companyName,
  companyShortName,
}: {
  className?: string;
  slogan?: string | null;
  src?: string | null;
  companyName?: string | null;
  companyShortName?: string | null;
}) {
  const sloganText = String(slogan || '').trim();
  const fullName = String(companyName || '').trim() || 'LEVO Lighting';
  const shortName = String(companyShortName || '').trim() || 'LEVO';
  return (
    <HelpLink
      href="/"
      helpKey="catalog.logo"
      title={fullName}
      ariaLabel={sloganText ? `${shortName} ${sloganText}` : fullName}
      className={`inline-flex w-max flex-col items-stretch justify-center ${className}`}
    >
      <BrandLogoMark src={src} alt={shortName} width={160} height={48} priority className="h-9 md:h-10" />
      {sloganText ? (
        <span className="brand-slogan brand-slogan-lockup mt-0.5" aria-hidden="true">
          {Array.from(sloganText).map((ch, i) => (
            <span key={i}>{ch === ' ' ? '\u00a0' : ch}</span>
          ))}
        </span>
      ) : null}
    </HelpLink>
  );
}

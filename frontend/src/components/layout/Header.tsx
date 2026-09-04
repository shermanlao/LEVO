import SiteNav from '@/components/layout/SiteNav';
import Logo from '@/components/layout/Logo';

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
  return (
    <header className="site-chrome relative z-40 border-b py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Logo
            slogan={slogan}
            src={logoSrc}
            companyName={companyName}
            companyShortName={companyShortName}
          />
          <SiteNav />
        </div>
      </div>
    </header>
  );
}

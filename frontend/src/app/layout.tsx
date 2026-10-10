import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BackToTop from "@/components/layout/BackToTop";
import SaveNotice from "@/components/ui/SaveNotice";
import VisitorBeacon from "@/components/layout/VisitorBeacon";
import PublicCatalogGate from "@/components/layout/PublicCatalogGate";
import JsonLd from "@/components/layout/JsonLd";
import { loadPublicNavMenus } from "@/lib/public-nav";
import { getSiteContact, type SiteContact } from "@/lib/sqlite-api";
import { siteOrigin } from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo-jsonld";

const inter = Inter({ subsets: ["latin"] });

export const revalidate = 120;

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  let contact: SiteContact | null = null;
  try {
    contact = await getSiteContact();
  } catch {
    /* keep defaults when the API is down */
  }
  const company = contact?.company_name?.trim() || 'LEVO Lighting';
  const title =
    contact?.seo_title?.trim() ||
    'LEVO Lighting | Architectural LED Downlights & Luminaires';
  const description =
    contact?.seo_description?.trim() ||
    (contact?.slogan?.trim()
      ? `${company} — ${contact.slogan.trim()}. Architectural LED lighting for hotels, retail, and residences.`
      : 'Architectural LED lighting for hotels, retail, and residences. Browse downlights, datasheets, and photometric files.');
  const ogImage = contact?.og_image?.trim();
  const icon = contact?.logo_icon?.trim();
  const constructionOn = contact ? contact.public_under_construction !== false : true;
  return {
    metadataBase: new URL(siteOrigin()),
    title: {
      default: title,
      template: `%s | ${company}`,
    },
    description,
    icons: icon ? { icon } : undefined,
    robots: constructionOn ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      siteName: company,
      type: 'website',
      url: siteOrigin(),
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let contact: SiteContact | null = null;
  try {
    contact = await getSiteContact();
  } catch (error) {
    console.error('RootLayout - Failed to load contact details:', error);
  }

  const constructionOn = contact ? contact.public_under_construction !== false : true;
  const navMenus = await loadPublicNavMenus();

  const company = contact?.company_name?.trim() || 'LEVO Lighting';
  const sameAs = [
    contact?.social_linkedin,
    contact?.social_facebook,
    contact?.social_instagram,
    contact?.social_threads,
    contact?.social_pinterest,
  ]
    .map((url) => String(url || '').trim())
    .filter(Boolean);

  return (
    <html lang="en">
      <body className={inter.className}>
        <JsonLd
          data={[
            organizationJsonLd({
              name: company,
              slogan: contact?.slogan?.trim(),
              logo: contact?.logo_header?.trim() || contact?.logo_icon?.trim(),
              email: contact?.email?.trim(),
              telephone: contact?.phone?.trim(),
              address: contact?.address?.trim(),
              sameAs,
            }),
            websiteJsonLd({ name: company }),
          ]}
        />
        <Header
          slogan={contact?.slogan}
          logoSrc={contact?.logo_header}
          companyName={contact?.company_name}
          companyShortName={contact?.company_short_name}
          productCategories={navMenus.productCategories}
          projectCategories={navMenus.projectCategories}
        />
        <main className="container mx-auto py-4 px-4">
          <PublicCatalogGate constructionOn={constructionOn}>
            {children}
          </PublicCatalogGate>
        </main>
        <Footer contact={contact} />
        <BackToTop />
        <SaveNotice />
        <VisitorBeacon />
      </body>
    </html>
  );
}

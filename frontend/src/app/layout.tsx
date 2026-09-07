import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cookies, headers } from "next/headers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BackToTop from "@/components/layout/BackToTop";
import VisitorBeacon from "@/components/layout/VisitorBeacon";
import UnderConstruction from "@/components/layout/UnderConstruction";
import { getSiteContact, type SiteContact } from "@/lib/sqlite-api";
import { ADMIN_SESSION_COOKIE, verifySessionValue } from "@/lib/admin-session";

const inter = Inter({ subsets: ["latin"] });

export const revalidate = 120;

export const viewport: Viewport = {
  viewportFit: 'cover',
};

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_ORIGIN || 'http://localhost:3000';
}

export async function generateMetadata(): Promise<Metadata> {
  let contact: SiteContact | null = null;
  try {
    contact = await getSiteContact();
  } catch {
    /* keep defaults when the API is down */
  }
  const company = contact?.company_name?.trim() || 'LEVO Lighting';
  const title = contact?.seo_title?.trim() || company;
  const description =
    contact?.seo_description?.trim() ||
    (contact?.slogan?.trim()
      ? `${company} — ${contact.slogan.trim()}. Professional lighting solutions for every space.`
      : 'Professional lighting solutions for every space');
  const ogImage = contact?.og_image?.trim();
  const icon = contact?.logo_icon?.trim();
  return {
    metadataBase: new URL(siteOrigin()),
    title,
    description,
    icons: icon ? { icon } : undefined,
    openGraph: {
      title,
      description,
      siteName: company,
      images: ogImage ? [{ url: ogImage }] : undefined,
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

  const pathname = (await headers()).get('x-levo-pathname') || '';
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const staffSession = await verifySessionValue(token);
  const constructionOn = contact ? contact.public_under_construction !== false : true;
  const hidePublicCatalog = constructionOn && !staffSession && !pathname.startsWith('/admin');

  return (
    <html lang="en">
      <body className={inter.className}>
        <Header
          slogan={contact?.slogan}
          logoSrc={contact?.logo_header}
          companyName={contact?.company_name}
          companyShortName={contact?.company_short_name}
        />
        <main className="container mx-auto py-4 px-4">
          {hidePublicCatalog ? <UnderConstruction /> : children}
        </main>
        <Footer contact={contact} />
        <BackToTop />
        <VisitorBeacon />
      </body>
    </html>
  );
}

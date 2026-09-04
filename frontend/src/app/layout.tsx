import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BackToTop from "@/components/layout/BackToTop";
import VisitorBeacon from "@/components/layout/VisitorBeacon";
import { getSiteContact, type SiteContact } from "@/lib/sqlite-api";

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
          {children}
        </main>
        <Footer contact={contact} />
        <BackToTop />
        <VisitorBeacon />
      </body>
    </html>
  );
}

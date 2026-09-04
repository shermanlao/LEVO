import { Metadata } from 'next';
import Image from 'next/image';
import SeriesGrid, { type SeriesGridRow } from '@/components/products/SeriesGrid';
import ProjectCatalog, { type ProjectListItem } from '@/components/projects/ProjectCatalog';
import { getFeaturedSeries, getFeaturedProjects, getSiteContact } from '@/lib/sqlite-api';
import { asStrapiList } from '@/lib/strapi-entity';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import EmptyState from '@/components/ui/EmptyState';
import FeatureCard from '@/components/ui/FeatureCard';
import BrandSlogan from '@/components/layout/BrandSlogan';
import WhyChooseIcon from '@/components/layout/WhyChooseIcon';
import { IMAGE_FRAMES } from '@/lib/image-frames';

export const revalidate = 120;

function toProjectItem(row: Record<string, unknown>): ProjectListItem | null {
  if (!row || typeof row !== 'object') return null;
  const id = (row.id as number | string) ?? '';
  const name = String(row.name || row.title || 'Untitled Project');
  const slug = String(row.slug || `project-${id}`);
  return {
    id,
    attributes: {
      name,
      title: String(row.title || name),
      subtitle: String(row.subtitle || ''),
      location: String(row.location || ''),
      slug,
      category: String(row.category || 'General'),
      year: String(row.year || ''),
      description: String(row.description || ''),
      thumbnail: row.thumbnail ? String(row.thumbnail) : undefined,
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const contact = await getSiteContact();
    const company = contact.company_name?.trim() || 'LEVO Lighting';
    const slogan = contact.slogan?.trim() || '';
    return {
      title: contact.seo_title?.trim() || (slogan ? `${company} - ${slogan}` : `${company} - Innovative Lighting Solutions`),
      description:
        contact.seo_description?.trim() ||
        (slogan
          ? `Discover ${company}'s range of innovative lighting solutions for modern spaces. ${slogan}.`
          : `Discover ${company}'s range of innovative lighting solutions for modern spaces.`),
    };
  } catch {
    return {
      title: 'LEVO Lighting - Innovative Lighting Solutions',
      description: "Discover LEVO Lighting's range of innovative lighting solutions for modern spaces.",
    };
  }
}

export default async function Home() {
  let featuredSeries: SeriesGridRow[] = [];
  let featuredError: string | null = null;
  let featuredProjects: ProjectListItem[] = [];
  let contact = null;
  try {
    contact = await getSiteContact();
  } catch {
    /* settings stay empty when contact details are unavailable */
  }
  try {
    const response = await getFeaturedSeries();
    featuredSeries = asStrapiList(response?.data) as SeriesGridRow[];
  } catch (error) {
    console.error('Home - Failed to load featured series:', error);
    featuredError = 'Could not load featured series. Check that the API and database are available.';
  }
  try {
    featuredProjects = (await getFeaturedProjects()).map((row) => toProjectItem(row)).filter(Boolean) as ProjectListItem[];
  } catch {
    featuredProjects = [];
  }

  const slogan = contact?.slogan?.trim() || '';
  const company = contact?.company_name?.trim() || 'LEVO Lighting';
  const heroTitle = contact?.hero_title?.trim() || 'Innovative Lighting Solutions for Modern Spaces';
  const heroSubtitle =
    contact?.hero_subtitle?.trim() ||
    'Discover our range of energy-efficient, stylish lighting products designed for both residential and commercial applications.';
  const ctaLabel = contact?.hero_cta_label?.trim() || 'Explore Products';
  const ctaHref = contact?.hero_cta_href?.trim() || '/products';
  const heroImage = contact?.hero_image?.trim() || '/hero-image.jpg';
  const featuredHeading = contact?.featured_heading?.trim() || 'Featured Products';
  const featuredProjectsHeading = contact?.featured_projects_heading?.trim() || 'Featured Projects';
  const whyHeading = contact?.why_heading?.trim() || `Why Choose ${company.replace(/ Lighting$/, '')}?`;
  const whyCards = Array.isArray(contact?.why_cards) && contact.why_cards.length
    ? contact.why_cards
    : [
        { icon: 'energy' as const, title: 'Energy Efficient', body: 'Our products are designed with sustainability in mind, reducing energy consumption without compromising on performance.' },
        { icon: 'lifespan' as const, title: 'Long Lifespan', body: `${company} products are built to last, with high-quality materials and components that ensure years of reliable performance.` },
        { icon: 'design' as const, title: 'Design Excellence', body: 'Our products combine aesthetic appeal with functional design, enhancing any space they illuminate.' },
      ];

  return (
    <main>
      <section className="bg-gradient-to-b from-gray-100 to-white py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
              <BrandSlogan slogan={slogan} className="brand-slogan-hero" />
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900 mb-4">
                {heroTitle}
              </h1>
              <p className="text-lg text-gray-600 mb-6">{heroSubtitle}</p>
              <Button helpKey="catalog.home.explore" href={ctaHref}>
                {ctaLabel}
              </Button>
            </div>
            <div className="md:w-1/2">
              <div className={`relative w-full overflow-hidden rounded-lg shadow-xl ${IMAGE_FRAMES.hero.className}`}>
                <Image
                  src={heroImage}
                  alt={`${company} Products`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{featuredHeading}</h2>
          {featuredError ? (
            <AlertBanner>{featuredError}</AlertBanner>
          ) : featuredSeries.length === 0 ? (
            <EmptyState>No featured series found.</EmptyState>
          ) : (
            <SeriesGrid seriesList={featuredSeries} emptyText="No featured series found." />
          )}
        </div>
      </section>

      {featuredProjects.length > 0 ? (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">{featuredProjectsHeading}</h2>
            <ProjectCatalog projects={featuredProjects} hideFilters />
          </div>
        </section>
      ) : null}

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{whyHeading}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyCards.map((card) => (
              <FeatureCard key={`${card.icon}-${card.title}`} title={card.title} icon={<WhyChooseIcon icon={card.icon} />}>
                {card.body}
              </FeatureCard>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}










import React from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import RobustImage from '@/components/ui/robust-image';
import ProjectThumbnail from '@/components/projects/ProjectThumbnail';
import ProjectGalleryImage from '@/components/projects/ProjectGalleryImage';
import RelatedProjectCard from '@/components/projects/RelatedProjectCard';
import ProjectDetails from '@/components/projects/ProjectDetails';
import ImageLightbox from '@/components/ui/ImageLightbox';
import ProjectGalleryWrapper from '@/components/projects/ProjectGalleryWrapper';
import { getProjectBySlugFromApi, getRelatedProjectsFromApi } from '@/lib/sqlite-api';
import PageRoute from '@/components/layout/PageRoute';
import { projectRouteItems } from '@/components/layout/pageRouteItems';

export const revalidate = 120;

interface ProjectSection {
  id: number;
  project_id: string;
  title: string;
  content: string;
  order: number;
  images?: string[];
}

interface Project {
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  location?: string;
  year?: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  client?: string;
  architect?: string;
  interior_designer?: string;
  lighting_designer?: string;
  photography_credits?: string;
  place?: string;
  country?: string;
  date?: string;
  maplink?: string;
  sections?: ProjectSection[];
  paragraphs?: {
    id: string;
    title: string;
    content: string;
  }[];
  exhibition_design?: string;
}

async function getProjectData(slug: string): Promise<Project | null> {
  const row = await getProjectBySlugFromApi(slug);
  if (!row) return null;
  const name =
    row.name ||
    row.title ||
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return {
    ...row,
    id: String(row.id),
    name,
    slug: row.slug || slug,
    sections: row.sections || [],
    paragraphs: row.paragraphs || [],
  } as Project;
}

interface RelatedProjectSummary {
  title: string;
  description: string;
  imageUrl: string;
  projectUrl: string;
}

async function getRelatedProjectSummaries(
  excludeSlug: string,
  limit: number = 3
): Promise<RelatedProjectSummary[]> {
  try {
    const rows = await getRelatedProjectsFromApi(excludeSlug, limit);
    return rows
      .filter((r) => String(r.slug) !== excludeSlug)
      .map((r) => {
        const slug = String(r.slug ?? '');
        const title = String(r.name || r.title || slug || 'Project');
        const desc = String(r.description ?? '');
        const short = desc.length > 160 ? `${desc.slice(0, 157).trim()}…` : desc;
        return {
          title,
          description: short,
          imageUrl:
            (r.thumbnail as string) ||
            `/images/projects/${slug}/${slug}-thumbnail.jpg`,
          projectUrl: `/projects/${slug}`,
        };
      });
  } catch (e) {
    console.error('[getRelatedProjectSummaries]', e);
    return [];
  }
}

// Function to check if an image exists (added at the top of file)
function getImageWithFallback(url: string, fallbackUrl: string = '/images/products/general/placeholder-project.jpg'): string {
  if (!url) return fallbackUrl;
  // Normalize URL to handle both absolute and relative paths
  const normalizedUrl = url.startsWith('http') ? url : url;
  return normalizedUrl;
}

type Props = {
  params: Promise<{ slug: string }>;
};

// Generate metadata for the page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const project = await getProjectData(slug);
    
    if (project && project.name) {
      return {
        title: `${project.name} | LEVO Lighting`,
        description: project.description || `Details about the ${project.name} project by LEVO Lighting.`
      };
    }
    
    // Fallback metadata with slug if project exists but name is missing
    if (project) {
      return {
        title: `${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')} | LEVO Lighting`,
        description: `Project details by LEVO Lighting.`
      };
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }
  
  // Fallback metadata
  return {
    title: 'Project Details | LEVO Lighting',
    description: 'LED lighting project showcase by LEVO.'
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  
  try {
    // Get the project data using the slug
    const project = await getProjectData(slug);
    console.log('[ProjectPage] getProjectData result:', project ? 'Data found' : 'No data found');
    
    if (!project) {
      console.error(`[ProjectPage] No project data found for slug: ${slug}`);
      return notFound();
    }

    const relatedProjects = await getRelatedProjectSummaries(slug, 3);
    
    // Log project data for debugging
    console.log('[ProjectPage] Project data loaded:', {
      id: project.id,
      name: project.name,
      architect: project.architect,
      interior_designer: project.interior_designer,
      client: project.client,
      place: project.place,
      country: project.country,
      date: project.date,
      maplink: project.maplink,
      hasExhibitionDesign: !!project.exhibition_design
    });
    
    // Extract project details
    const { name, description, sections = [], paragraphs = [] } = project;
    
    // Get image for hero section, prioritizing thumbnail
    const heroImage =
      project.thumbnail || `/images/projects/${slug}/${slug}-thumbnail.jpg`;
  
    // Ensure we have proper names and descriptions for alt text
    const projectName = name || 'Project';
    const projectDescription = description || 'LEVO Lighting project';

    return (
      <div className="bg-white">
        <div className="container mx-auto px-4 pt-4">
          <PageRoute items={projectRouteItems({ name: projectName })} />
        </div>

        {/* Hero Section */}
        <div className="relative w-full h-[50vh] overflow-hidden">
          <ProjectThumbnail
            projectId={project.id}
            projectSlug={slug}
            thumbnailPath={heroImage}
            alt={`${projectName} - Featured image`}
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-end">
            <div className="container mx-auto px-4 pb-8 text-white max-w-6xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{name}</h1>
              {description && (
                <p className="text-lg md:text-xl max-w-2xl">{description}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Project Overview */}
        <section className="bg-white py-10 md:py-14">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="max-w-full">
              <h2 className="text-2xl font-bold mb-6 pb-3 border-b border-gray-200">A Fusion of Heritage and Modernity</h2>
              
              <div className="prose max-w-none text-base leading-relaxed">
                {paragraphs && paragraphs.map((paragraph: any, index: number) => (
                  <div key={paragraph.id || index} className="mb-6">
                    {paragraph.title && (
                      <h3 className="text-xl font-semibold mb-3">{paragraph.title}</h3>
                    )}
                    <p>{paragraph.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        
        {/* Project Details */}
        <section className="bg-white py-10 border-t border-b border-gray-200">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 gap-8">
              <div>
                <ProjectDetails
                  photography={project.photography_credits}
                  client={project.client}
                  architect={project.architect}
                  interiorDesigner={project.interior_designer}
                  lightingDesigner={project.lighting_designer}
                  place={project.place || project.location?.split(',')[0]?.trim()}
                  country={project.country || project.location?.split(',').pop()?.trim()}
                  date={project.date || (project.year ? formatDate(project.year) : undefined)}
                  mapLink={project.maplink}
                  exhibitionDesign={project.exhibition_design ? JSON.parse(project.exhibition_design) : []}
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Project Gallery */}
        {sections && sections.length > 0 && (
          <section className="bg-white py-12 md:py-16">
            <div className="container mx-auto px-4 max-w-6xl">
              <h2 className="text-3xl font-bold mb-8 text-center">Project Gallery</h2>
              
              {sections.map((section: any, sectionIndex: number) => (
                <div 
                  key={section.id || sectionIndex} 
                  className="mb-16"
                >
                  {section.title && (
                    <h3 className="text-2xl font-semibold mb-4">{section.title}</h3>
                  )}
                  
                  {section.images && section.images.length > 0 ? (
                    <>
                      <div className="flex flex-col md:flex-row gap-8 mb-12">
                        {/* Left column: Content */}
                        <div className="md:w-1/2">
                          {section.content && (
                            <p className="text-lg">{section.content}</p>
                          )}
                        </div>
                        
                        {/* Right column: First image */}
                        <div className="md:w-1/2">
                          <div className="relative h-[400px] overflow-hidden">
                            <ImageLightbox
                              src={section.images[0]}
                              alt={`${section.title || projectName} - Gallery image 1`}
                              preserveAspectRatio={true}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Remaining images - full width, one per row */}
                      {section.images.length > 1 && (
                        <div className="w-full space-y-24">
                          {section.images.slice(1).map((imageUrl: string, index: number) => (
                            <div key={index + 1} className="w-full">
                              <div className="relative h-[650px] overflow-hidden">
                                <ImageLightbox 
                                  src={imageUrl}
                                  alt={`${section.title || projectName} - Gallery image ${index + 2}`}
                                  preserveAspectRatio={true}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    section.content && (
                      <p className="text-lg mb-6 max-w-4xl">{section.content}</p>
                    )
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        
        {relatedProjects.length > 0 && (
          <section className="bg-gray-50 py-12 md:py-16">
            <div className="container mx-auto px-4 max-w-6xl">
              <h2 className="text-2xl font-bold mb-8 text-center">This may also be of interest</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {relatedProjects.map((rp) => (
                  <RelatedProjectCard
                    key={rp.projectUrl}
                    title={rp.title}
                    description={rp.description}
                    imageUrl={rp.imageUrl}
                    projectUrl={rp.projectUrl}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* Contact CTA */}
        <section className="bg-blue-700 text-white py-10 md:py-12">
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <h2 className="text-2xl font-bold mb-4">Planning a similar project?</h2>
            <p className="text-lg mb-6 max-w-xl mx-auto">Let our lighting experts help you create the perfect atmosphere for your space.</p>
            <Link 
              href="/contact" 
              className="inline-block bg-white text-blue-700 font-semibold px-6 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    console.error('[ProjectPage] Error rendering project page:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Error Loading Project</h1>
        <p>Sorry, there was an error loading this project. Please try again later.</p>
      </div>
    );
  }
}

// Helper function to format date as MM/YYYY
function formatDate(dateString: string): string {
  // Handle different date formats
  if (dateString.includes('/')) {
    // If already in MM/YYYY format, return as is
    return dateString;
  } else if (dateString.match(/^\d{4}$/)) {
    // If just a year (YYYY), return as 01/YYYY
    return `01/${dateString}`;
  } else {
    try {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    } catch (e) {
      // If parsing fails, return original
      return dateString;
    }
  }
} 
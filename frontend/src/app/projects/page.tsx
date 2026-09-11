import type { Metadata } from 'next';
import PageRoute from '@/components/layout/PageRoute';
import { projectRouteItems } from '@/components/layout/pageRouteItems';
import ProjectCatalog, { type ProjectListItem } from '@/components/projects/ProjectCatalog';
import { getProjectsFromApi } from '@/lib/sqlite-api';
import AlertBanner from '@/components/ui/AlertBanner';
import JsonLd from '@/components/layout/JsonLd';
import { buildPageMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/seo-jsonld';

export const revalidate = 120;

export const metadata: Metadata = buildPageMetadata({
  title: 'Projects',
  description: 'Explore LEVO Lighting project case studies across architectural spaces.',
  path: '/projects',
});

function toListItem(row: Record<string, unknown>): ProjectListItem | null {
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

export default async function ProjectsPage() {
  const rows = await getProjectsFromApi();
  const projects = rows.map((row) => toListItem(row)).filter(Boolean) as ProjectListItem[];
  const loadError =
    projects.length === 0 ? 'No projects found. Please add projects in the admin panel.' : null;

  return (
    <div className="container mx-auto px-4 py-4">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
        ])}
      />
      <PageRoute items={projectRouteItems()} />
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Projects</h1>
        <p className="text-gray-600">Architectural lighting projects by LEVO.</p>
      </div>
      {loadError ? <AlertBanner>{loadError}</AlertBanner> : null}
      <ProjectCatalog projects={projects} />
    </div>
  );
}

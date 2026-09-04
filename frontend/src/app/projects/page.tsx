import PageRoute from '@/components/layout/PageRoute';
import { projectRouteItems } from '@/components/layout/pageRouteItems';
import ProjectCatalog, { type ProjectListItem } from '@/components/projects/ProjectCatalog';
import { getProjectsFromApi } from '@/lib/sqlite-api';
import AlertBanner from '@/components/ui/AlertBanner';

export const revalidate = 120;

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
      <PageRoute items={projectRouteItems()} />
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Projects</h1>
        <p className="text-gray-600 max-w-3xl">
          Discover how LEVO lighting solutions transform spaces across the globe. Our projects showcase
          innovative approaches to illumination across cultural, commercial, and residential environments.
        </p>
      </div>

      {loadError && <AlertBanner variant="warning">{loadError}</AlertBanner>}

      <ProjectCatalog projects={projects} />
    </div>
  );
}

import { redirect } from 'next/navigation';
import { getProjectByIdFromApi } from '@/lib/sqlite-api';

export default async function ProjectIdRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectByIdFromApi(id);
  const slug = project?.slug ? String(project.slug) : '';
  if (!slug) {
    redirect('/projects');
  }
  redirect(`/projects/${slug}`);
}

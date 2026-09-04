import { redirect } from 'next/navigation';
import { getProjectByIdFromApi } from '@/lib/sqlite-api';

export default async function ProjectIdRedirect({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = params instanceof Promise ? await params : params;
  const project = await getProjectByIdFromApi(resolved.id);
  const slug = project?.slug ? String(project.slug) : '';
  if (!slug) {
    redirect('/projects');
  }
  redirect(`/projects/${slug}`);
}

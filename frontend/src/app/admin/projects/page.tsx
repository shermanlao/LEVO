'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';

interface Project {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  category: string;
  year: string;
  thumbnail: string;
  description: string;
  is_featured?: boolean;
  client?: string;
  architect?: string;
  lightingDesigner?: string;
  photographyCredits?: string;
  sections?: {
    title: string;
    content: string;
    images: string[];
  }[];
  products?: {
    name: string;
    image: string;
    url: string;
  }[];
}

export default function ProjectsAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    title: '',
    subtitle: '',
    location: '',
    category: 'Culture',
    year: new Date().getFullYear().toString(),
    thumbnail: '',
    description: '',
    is_featured: false,
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/backend/projects', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : [];
        const mapped: Project[] = list.map((item: any) => {
          const a = item.attributes || item || {};
          return {
            id: String(item.id),
            title: a.title || a.name || '',
            subtitle: a.subtitle || '',
            location: a.location || '',
            category: a.category || '',
            year: a.year != null ? String(a.year) : '',
            thumbnail: a.thumbnail || '',
            description: a.description || '',
            is_featured: Boolean(a.is_featured),
          };
        });
        setProjects(mapped);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Is the API server running?');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProject({ ...newProject, [name]: value });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const slug =
        newProject.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') || '';
      const res = await fetch('/api/admin/backend/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: newProject.title,
          subtitle: newProject.subtitle,
          location: newProject.location,
          category: newProject.category,
          year: newProject.year,
          thumbnail: newProject.thumbnail,
          description: newProject.description,
          is_featured: Boolean(newProject.is_featured),
        }),
      });
      if (!res.ok) {
        setError(
          'Creating projects via this form is not supported by the API, or the request was rejected. Add projects through the database or extend POST /api/projects on the server.'
        );
        return;
      }
      const json = await res.json().catch(() => ({}));
      const created = json.data ?? json;
      const id = created?.id != null ? String(created.id) : slug;
      setProjects([
        ...projects,
        {
          id,
          title: newProject.title || '',
          subtitle: newProject.subtitle || '',
          location: newProject.location || '',
          category: newProject.category || '',
          year: newProject.year || '',
          thumbnail: newProject.thumbnail || '',
          description: newProject.description || '',
          is_featured: Boolean(newProject.is_featured),
        },
      ]);
      setIsCreating(false);
      setNewProject({
        title: '',
        subtitle: '',
        location: '',
        category: 'Culture',
        year: new Date().getFullYear().toString(),
        thumbnail: '',
        description: '',
        is_featured: false,
      });
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        const res = await fetch(`/api/admin/backend/projects/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          setError(
            'Delete request failed. The API may not support DELETE /api/projects/:id yet.'
          );
          return;
        }
        setProjects(projects.filter((project) => project.id !== id));
      } catch (err) {
        console.error('Error deleting project:', err);
        setError('Failed to delete project. Please try again.');
      }
    }
  };

  const categories = ['Culture', 'Office', 'Residential', 'Retail', 'Hospitality'];

  return (
    <div>
      <AdminPageHeader
        title="Projects Management"
        actions={
          <Button helpKey="admin.projects.add" onClick={() => setIsCreating(!isCreating)}>
            {isCreating ? 'Cancel' : 'Add New Project'}
          </Button>
        }
      />
      
      {error && <AlertBanner>{error}</AlertBanner>}
      
      {isCreating && (
        <div className="bg-white shadow-md rounded p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
          <form onSubmit={handleCreateProject}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={newProject.title}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Subtitle
                </label>
                <input
                  type="text"
                  name="subtitle"
                  value={newProject.subtitle}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={newProject.location}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={newProject.category}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Year
                </label>
                <input
                  type="text"
                  name="year"
                  value={newProject.year}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Thumbnail Image Path
                </label>
                <input
                  type="text"
                  name="thumbnail"
                  value={newProject.thumbnail}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="/images/projects/your-image.jpg"
                />
              </div>
              
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create_is_featured"
                  name="is_featured"
                  checked={Boolean(newProject.is_featured)}
                  onChange={(e) => setNewProject({ ...newProject, is_featured: e.target.checked })}
                />
                <label htmlFor="create_is_featured" className="text-gray-700">
                  Featured project
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={newProject.description}
                  onChange={handleInputChange}
                  className="input-field"
                  rows={4}
                  required
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button helpKey="admin.projects.create" type="submit">
                Create Project
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Projects Table */}
      <div className="bg-white shadow-md rounded overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thumbnail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Featured
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Loading projects...
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No projects found.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <AdminHoverPreview src={project.thumbnail || null}>
                    <div className="w-20 aspect-video bg-gray-200 relative rounded overflow-hidden">
                      {project.thumbnail ? (
                        <img 
                          src={project.thumbnail} 
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          No image
                        </div>
                      )}
                    </div>
                    </AdminHoverPreview>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.title}</div>
                    <div className="text-sm text-gray-500">{project.subtitle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {project.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.is_featured ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
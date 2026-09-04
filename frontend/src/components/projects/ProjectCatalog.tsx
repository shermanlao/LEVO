'use client';

import { useState } from 'react';
import Link from 'next/link';
import RobustImage from '@/components/ui/robust-image';
import { IMAGE_FRAMES } from '@/lib/image-frames';

export type ProjectListItem = {
  id: number | string;
  attributes: {
    name: string;
    title?: string;
    subtitle?: string;
    location?: string;
    slug: string;
    category?: string;
    year?: string;
    description?: string;
    thumbnail?: string;
  };
};

const CATEGORIES = ['All', 'Culture', 'Office', 'Residential', 'Retail', 'Hospitality'];

export default function ProjectCatalog({
  projects,
  hideFilters = false,
}: {
  projects: ProjectListItem[];
  hideFilters?: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const filtered =
    selectedCategory === 'All'
      ? projects
      : projects.filter((project) => project.attributes.category === selectedCategory);

  return (
    <>
      {hideFilters ? null : (
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">No projects found for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((project) => {
            if (!project.attributes) return null;
            const projectSlug = project.attributes.slug;
            const thumbnailPath =
              project.attributes.thumbnail ||
              `/images/projects/${projectSlug}/${projectSlug}-thumbnail.jpg`;

            return (
              <Link
                href={`/projects/${projectSlug}`}
                key={project.id}
                className="group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className={`relative overflow-hidden ${IMAGE_FRAMES.project.className}`}>
                  <RobustImage
                    src={thumbnailPath}
                    alt={project.attributes.name || 'Project thumbnail'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-100 rounded-md">
                      {project.attributes.category || 'General'}
                    </span>
                    <span className="text-sm text-gray-500">{project.attributes.year || '-'}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    {project.attributes.name || project.attributes.title || 'Untitled Project'}
                  </h3>
                  <h4 className="text-md font-medium text-gray-600 mb-2">
                    {project.attributes.subtitle || ''}
                  </h4>
                  <p className="text-gray-600 mb-2">{project.attributes.location || ''}</p>
                  <p className="text-sm text-gray-500">{project.attributes.description || ''}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

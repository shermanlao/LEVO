'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProjectImageUploader from '@/components/admin/ProjectImageUploader';
import DirectProjectImageUploader from '@/components/admin/DirectProjectImageUploader';
import { uploadProjectImage, removeProjectImage } from '@/lib/project-upload';
import ProjectThumbnail from '@/components/projects/ProjectThumbnail';
import NotFoundView from '@/components/layout/NotFoundView';
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
  client?: string;
  architect?: string;
  lightingDesigner?: string;
  photographyCredits?: string;
  is_featured?: boolean;
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
  paragraphs?: {
    title: string;
    content: string;
    id: string;
  }[];
}

export default function EditProjectPage() {
  const router = useRouter();
  const projectId = String(useParams<{ id: string }>().id || '');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Project | null>(null);
  const [saveStatus, setSaveStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch project data from API
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        
        // Fetch project data from the API with query parameter
        const response = await fetch(`/api/admin/backend/projects/id/${projectId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch project data');
        }
        
        const projectData = data.data;
        
        if (projectData) {
          console.log("Found project:", projectData);
          
          // Transform API data format to match our component's expected format
          const formattedProject: Project = {
            id: projectData.id || projectId,
            title: projectData.title || '',
            subtitle: projectData.subtitle || '',
            location: projectData.location || '',
            category: projectData.category || '',
            year: projectData.year || '',
            thumbnail: projectData.thumbnail || '',
            description: projectData.description || '',
            client: projectData.client || '',
            architect: projectData.architect || '',
            lightingDesigner: projectData.lighting_designer || '',
            photographyCredits: projectData.photography_credits || '',
            is_featured: Boolean(projectData.is_featured),
            sections: projectData.sections?.map((section: any) => ({
              title: section.title || '',
              content: section.content || '',
              images: section.images || []
            })) || [],
            products: projectData.products?.map((product: any) => ({
              name: product.name || '',
              image: product.image || '',
              url: product.url || ''
            })) || [],
            paragraphs: projectData.paragraphs?.map((paragraph: any, index: number) => ({
              id: paragraph.id || index.toString(),
              title: paragraph.title || '',
              content: paragraph.content || ''
            })) || []
          };
          
          setProject(formattedProject);
          setEditedProject(formattedProject);
        } else {
          setError('Project not found');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProject(project);
    setSaveStatus(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editedProject) {
      setEditedProject({ ...editedProject, [name]: value });
    }
  };

  const handleSave = async () => {
    if (!editedProject) return;
    
    try {
      const res = await fetch(`/api/admin/backend/projects/${editedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedProject.title,
          subtitle: editedProject.subtitle,
          location: editedProject.location,
          category: editedProject.category,
          year: editedProject.year,
          thumbnail: editedProject.thumbnail,
          description: editedProject.description,
          client: editedProject.client || '',
          architect: editedProject.architect || '',
          lighting_designer: editedProject.lightingDesigner || '',
          photography_credits: editedProject.photographyCredits || '',
          is_featured: Boolean(editedProject.is_featured),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Save failed (${res.status})`);
      }
      setProject(editedProject);
      setIsEditing(false);
      setSaveStatus({ message: 'Project updated successfully!', type: 'success' });
      
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating project:', err);
      setSaveStatus({
        message: err instanceof Error ? err.message : 'Failed to update project. Please try again.',
        type: 'error',
      });
    }
  };

  // Handle thumbnail image upload
  const handleImageUpload = async (file: File, imageType: string) => {
    if (!editedProject) return;
    
    setUploadingImage(true);
    try {
      const result = await uploadProjectImage(
        file,
        editedProject.id,
        editedProject.id, // Using ID as slug for this example
        imageType
      );
      
      if (result.success && editedProject) {
        // Update the project with the new image URL
        if (imageType === 'thumbnail') {
          setEditedProject({
            ...editedProject,
            thumbnail: result.url
          });
          // Also update the main project state to immediately reflect the change
          if (project) {
            setProject({
              ...project,
              thumbnail: result.url
            });
          }
          
          // Show success message
          setSaveStatus({
            message: 'Thumbnail updated successfully!',
            type: 'success'
          });
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSaveStatus(null);
          }, 3000);
        }
        // For other image types, you would update the relevant section/property
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      setSaveStatus({ 
        message: 'Failed to upload image. Please try again.', 
        type: 'error' 
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Wrapper for thumbnail image upload that uses the new interface
  const handleThumbnailUpload = async (file: File): Promise<void> => {
    await handleImageUpload(file, 'thumbnail');
  };

  // Handle section image upload with wrapper function for the new interface
  const handleSectionImageUploadWrapper = (sectionIndex: number, imageIndex: number) => {
    return async (file: File): Promise<void> => {
      await handleSectionImageUpload(file, sectionIndex, imageIndex);
    };
  };

  // Handle thumbnail image removal
  const handleRemoveThumbnail = async () => {
    if (!editedProject) return;
    
    try {
      // Remove image reference
      await removeProjectImage(editedProject.id, editedProject.thumbnail);
      
      // Update state
      setEditedProject({
        ...editedProject,
        thumbnail: ''
      });
    } catch (error) {
      console.error('Failed to remove image:', error);
      setSaveStatus({ 
        message: 'Failed to remove image. Please try again.', 
        type: 'error' 
      });
    }
  };

  // Add a new section to the project
  const handleAddSection = () => {
    if (!editedProject) return;
    
    const newSection = {
      title: 'New Section',
      content: '',
      images: []
    };
    
    setEditedProject({
      ...editedProject,
      sections: [...(editedProject.sections || []), newSection]
    });
    
    // Show helper message
    setSaveStatus({
      message: 'New section added. You can now add images to it.',
      type: 'success'
    });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSaveStatus(null);
    }, 3000);
  };
  
  // Remove a section from the project
  const handleRemoveSection = (sectionIndex: number) => {
    if (!editedProject || !editedProject.sections) return;
    
    const updatedSections = [...editedProject.sections];
    updatedSections.splice(sectionIndex, 1);
    
    setEditedProject({
      ...editedProject,
      sections: updatedSections
    });
  };
  
  // Add a new image placeholder to a section
  const handleAddSectionImage = (sectionIndex: number) => {
    if (!editedProject || !editedProject.sections) return;
    
    const updatedSections = [...editedProject.sections];
    
    // Add an empty string as placeholder for a new image
    updatedSections[sectionIndex].images.push('');
    
    setEditedProject({
      ...editedProject,
      sections: updatedSections
    });
    
    // Show helper message
    setSaveStatus({
      message: 'Image placeholder added. Click the upload button to add an image.',
      type: 'success'
    });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSaveStatus(null);
    }, 3000);
  };
  
  // Handle uploading a section image
  const handleSectionImageUpload = async (file: File, sectionIndex: number, imageIndex: number) => {
    if (!editedProject || !editedProject.sections) return;
    
    setUploadingImage(true);
    try {
      const result = await uploadProjectImage(
        file,
        editedProject.id,
        editedProject.id, // Using ID as slug for this example
        `section-${sectionIndex}-image-${imageIndex}`
      );
      
      if (result.success) {
        // Update the section image URL
        const updatedSections = [...editedProject.sections];
        updatedSections[sectionIndex].images[imageIndex] = result.url;
        
        setEditedProject({
          ...editedProject,
          sections: updatedSections
        });
        
        // Update the main project state too
        if (project && project.sections) {
          const updatedProject = {...project};
          if (!updatedProject.sections) {
            updatedProject.sections = [...updatedSections];
          } else {
            updatedProject.sections = [...updatedSections];
          }
          setProject(updatedProject);
        }
        
        // Show success message
        setSaveStatus({
          message: 'Section image uploaded successfully!',
          type: 'success'
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveStatus(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to upload section image:', error);
      setSaveStatus({ 
        message: 'Failed to upload section image. Please try again.', 
        type: 'error' 
      });
    } finally {
      setUploadingImage(false);
    }
  };
  
  // Handle removing a section image
  const handleSectionImageRemove = (sectionIndex: number, imageIndex: number) => {
    if (!editedProject || !editedProject.sections) return;
    
    // Get the image path to remove
    const imagePath = editedProject.sections[sectionIndex].images[imageIndex];
    
    // Call the removeProjectImage function
    if (imagePath) {
      removeProjectImage(editedProject.id, imagePath);
    }
    
    // Update the state
    const updatedSections = [...editedProject.sections];
    updatedSections[sectionIndex].images.splice(imageIndex, 1);
    
    setEditedProject({
      ...editedProject,
      sections: updatedSections
    });
  };

  const categories = ['Culture', 'Office', 'Residential', 'Retail', 'Hospitality'];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Loading Project...</h1>
          <Link href="/admin/projects" className="text-blue-600 hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (error || !project) {
    if (!project && (!error || error === 'Project not found')) {
      return (
        <NotFoundView
          title="Project not found"
          description="This project is not in the LEVO project list."
          links={[
            { href: '/admin/projects', label: 'Back to projects', helpKey: 'admin.404.projects', variant: 'primary' },
            { href: '/admin', label: 'Dashboard', helpKey: 'admin.404.dashboard', variant: 'secondary' },
          ]}
        />
      );
    }
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Error</h1>
          <Link href="/admin/projects" className="btn-secondary inline-flex">
            Back to Projects
          </Link>
        </div>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error || 'Project not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={isEditing ? 'Edit Project' : project.title}
        backHref="/admin/projects"
        backLabel="Back to Projects"
        backHelpKey="admin.projects.back_list"
        actions={
          !isEditing ? (
            <Button helpKey="admin.projects.edit" onClick={handleEdit}>
              Edit Project
            </Button>
          ) : (
            <>
              <Button helpKey="admin.projects.save" onClick={handleSave}>
                Save Changes
              </Button>
              <Button helpKey="admin.projects.cancel_edit" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          )
        }
      />
      
      {saveStatus ? (
        <AlertBanner variant={saveStatus.type === 'success' ? 'success' : 'error'}>{saveStatus.message}</AlertBanner>
      ) : null}
      
      <div className="bg-white shadow-md rounded p-6">
        {isEditing && editedProject ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={editedProject.title}
                onChange={handleChange}
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
                value={editedProject.subtitle}
                onChange={handleChange}
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
                value={editedProject.location}
                onChange={handleChange}
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
                value={editedProject.category}
                onChange={handleChange}
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
                value={editedProject.year}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Client
              </label>
              <input
                type="text"
                name="client"
                value={editedProject.client || ''}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Architect
              </label>
              <input
                type="text"
                name="architect"
                value={editedProject.architect || ''}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Lighting Designer
              </label>
              <input
                type="text"
                name="lightingDesigner"
                value={editedProject.lightingDesigner || ''}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                id="edit_is_featured"
                checked={Boolean(editedProject.is_featured)}
                onChange={(e) =>
                  setEditedProject({ ...editedProject, is_featured: e.target.checked })
                }
              />
              <label htmlFor="edit_is_featured" className="text-gray-700">
                Featured project
              </label>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Photography Credits
              </label>
              <input
                type="text"
                name="photographyCredits"
                value={editedProject.photographyCredits || ''}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={editedProject.description}
                onChange={handleChange}
                className="input-field"
                rows={4}
                required
              />
            </div>
            
            {/* Project Thumbnail Image Uploader */}
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Project Thumbnail
              </label>
              <ProjectImageUploader
                projectId={editedProject.id}
                imageType="thumbnail"
                imagePath={editedProject.thumbnail}
                onUpload={handleThumbnailUpload}
                onRemove={handleRemoveThumbnail}
                isEditMode={isEditing && !uploadingImage}
              />
              <p className="mt-1 text-sm text-gray-500">
                This is the main image shown in project listings. The crop board uses the same 16:9 frame as the public cards.
              </p>
            </div>
            
            {/* Project Sections with Images */}
            <div className="md:col-span-2 mt-8 border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Project Sections</h2>
              
              {editedProject.sections && editedProject.sections.length > 0 ? (
                <div className="space-y-8">
                  {editedProject.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="text-lg font-semibold mb-3">Section {sectionIndex + 1}</h3>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Section Title
                        </label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => {
                            if (editedProject.sections) {
                              const updatedSections = [...editedProject.sections];
                              updatedSections[sectionIndex].title = e.target.value;
                              setEditedProject({
                                ...editedProject,
                                sections: updatedSections
                              });
                            }
                          }}
                          className="input-field"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Section Content
                        </label>
                        <textarea
                          value={section.content}
                          onChange={(e) => {
                            if (editedProject.sections) {
                              const updatedSections = [...editedProject.sections];
                              updatedSections[sectionIndex].content = e.target.value;
                              setEditedProject({
                                ...editedProject,
                                sections: updatedSections
                              });
                            }
                          }}
                          rows={3}
                          className="input-field"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Section Images
                        </label>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          {section.images.map((imagePath, imageIndex) => (
                            <div key={imageIndex} className="relative">
                              {isEditing ? (
                                <DirectProjectImageUploader 
                                  projectId={editedProject.id}
                                  projectSlug={editedProject.id}
                                  sectionIndex={sectionIndex}
                                  imageIndex={imageIndex}
                                  currentImageUrl={imagePath}
                                  onSuccess={(url) => {
                                    // Update the image URL in the local state
                                    const updatedSections = [...editedProject.sections!];
                                    updatedSections[sectionIndex].images[imageIndex] = url;
                                    setEditedProject({
                                      ...editedProject,
                                      sections: updatedSections
                                    });
                                    
                                    // Show success message
                                    setSaveStatus({
                                      message: 'Image uploaded. Save the project to keep it.',
                                      type: 'success'
                                    });
                                    
                                    // Clear success message after 3 seconds
                                    setTimeout(() => {
                                      setSaveStatus(null);
                                    }, 3000);
                                  }}
                                  onError={(error) => {
                                    setSaveStatus({
                                      message: `Failed to upload image: ${error}`,
                                      type: 'error'
                                    });
                                  }}
                                />
                              ) : (
                                <ProjectImageUploader
                                  projectId={editedProject.id}
                                  imageType={`section-${sectionIndex}-image-${imageIndex}`}
                                  imagePath={imagePath}
                                  onUpload={handleSectionImageUploadWrapper(sectionIndex, imageIndex)}
                                  onRemove={() => handleSectionImageRemove(sectionIndex, imageIndex)}
                                  isEditMode={isEditing && !uploadingImage}
                                />
                              )}
                            </div>
                          ))}
                          
                          {/* Add Image Button */}
                          <div 
                            className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 aspect-[3/2]"
                            onClick={() => handleAddSectionImage(sectionIndex)}
                          >
                            <div className="text-center p-4">
                              <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                              </svg>
                              <p className="mt-2 text-sm text-gray-500">Add Image</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete Section Button */}
                      <div className="flex justify-end mt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(sectionIndex)}
                          className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-md text-sm font-medium flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove Section
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">No sections added yet</p>
                </div>
              )}
              
              {/* Add Section Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Section
                </button>
              </div>
            </div>
            
            {/* Project Paragraphs Editor */}
            <div className="md:col-span-2 mt-8 border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Project Paragraphs</h2>
              <p className="text-sm text-gray-600 mb-4">These paragraphs appear in the "A Fusion of Heritage and Modernity" section of the project detail page.</p>
              
              {editedProject.paragraphs && editedProject.paragraphs.length > 0 ? (
                <div className="space-y-6">
                  {editedProject.paragraphs.map((paragraph, paragraphIndex) => (
                    <div key={paragraphIndex} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="text-lg font-semibold mb-3">Paragraph {paragraphIndex + 1}</h3>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Paragraph Title
                        </label>
                        <input
                          type="text"
                          value={paragraph.title || ''}
                          onChange={(e) => {
                            if (editedProject.paragraphs) {
                              const updatedParagraphs = [...editedProject.paragraphs];
                              updatedParagraphs[paragraphIndex].title = e.target.value;
                              setEditedProject({
                                ...editedProject,
                                paragraphs: updatedParagraphs
                              });
                            }
                          }}
                          className="input-field"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Paragraph Content
                        </label>
                        <textarea
                          value={paragraph.content || ''}
                          onChange={(e) => {
                            if (editedProject.paragraphs) {
                              const updatedParagraphs = [...editedProject.paragraphs];
                              updatedParagraphs[paragraphIndex].content = e.target.value;
                              setEditedProject({
                                ...editedProject,
                                paragraphs: updatedParagraphs
                              });
                            }
                          }}
                          rows={4}
                          className="input-field"
                        />
                      </div>
                      
                      {/* Delete Paragraph Button */}
                      <div className="flex justify-end mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (editedProject.paragraphs) {
                              const updatedParagraphs = [...editedProject.paragraphs];
                              updatedParagraphs.splice(paragraphIndex, 1);
                              setEditedProject({
                                ...editedProject,
                                paragraphs: updatedParagraphs
                              });
                            }
                          }}
                          className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-md text-sm font-medium flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove Paragraph
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">No paragraphs added yet</p>
                </div>
              )}
              
              {/* Add Paragraph Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const newParagraph = {
                      title: '',
                      content: '',
                      id: Math.random().toString(36).substring(2, 9)
                    };
                    
                    setEditedProject({
                      ...editedProject,
                      paragraphs: [...(editedProject.paragraphs || []), newParagraph]
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Paragraph
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-2">Project Details</h2>
                <div className="space-y-4">
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Title</span>
                    <span className="block text-base">{project.title}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Subtitle</span>
                    <span className="block text-base">{project.subtitle}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Location</span>
                    <span className="block text-base">{project.location}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Category</span>
                    <span className="block text-base">{project.category}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Year</span>
                    <span className="block text-base">{project.year}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-500">Featured</span>
                    <span className="block text-base">{project.is_featured ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-bold mb-2">Description</h2>
                <p className="text-base text-gray-700 whitespace-pre-line">{project.description}</p>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-bold mb-4">Thumbnail</h2>
              <div className="bg-gray-100 rounded-lg overflow-hidden h-64 relative">
                {project.thumbnail ? (
                  <ProjectThumbnail
                    projectId={project.id}
                    projectSlug={project.id}
                    thumbnailPath={project.thumbnail}
                    alt={project.title}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    No thumbnail image available
                  </div>
                )}
              </div>
              </div>
            </div>
            
            {/* Show project sections and details that span the full width */}
            <div>
              {/* Show paragraphs if they exist */}
              {project.paragraphs && project.paragraphs.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h2 className="text-lg font-bold mb-4">Project Paragraphs</h2>
                  <div className="space-y-6">
                    {project.paragraphs.map((paragraph, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        {paragraph.title && (
                          <h3 className="font-medium text-lg mb-2">{paragraph.title}</h3>
                        )}
                        <p className="text-gray-700">{paragraph.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show project sections if they exist */}
              {project.sections && project.sections.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h2 className="text-lg font-bold mb-4">Project Sections</h2>
                  <div className="space-y-10">
                    {project.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="font-medium text-lg mb-3">{section.title || `Section ${sectionIndex + 1}`}</h3>
                        
                        <p className="text-gray-700 mb-6">{section.content}</p>
                        
                        {section.images && section.images.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-3">Section Images</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {section.images.map((imagePath, imageIndex) => (
                                <AdminHoverPreview key={imageIndex} src={imagePath} className="block">
                                <div className="relative h-36 bg-gray-200 rounded overflow-hidden">
                                  <img 
                                    src={imagePath} 
                                    alt={`Section ${sectionIndex + 1} Image ${imageIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                </AdminHoverPreview>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
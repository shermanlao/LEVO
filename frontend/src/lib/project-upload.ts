/**
 * Helper functions for project image uploads
 */

/**
 * Upload a project image
 * @param file Image file to upload
 * @param projectId ID of the project 
 * @param projectSlug Slug of the project for folder organization
 * @param imageType Type of image (e.g., thumbnail, gallery)
 * @returns Promise with upload result
 */
export async function uploadProjectImage(
  file: File,
  projectId: string,
  projectSlug: string,
  imageType: string
): Promise<{ success: boolean; url: string }> {
  try {
    // Create form data with metadata
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('projectSlug', projectSlug);
    formData.append('imageType', imageType);

    // Call the upload API
    const response = await fetch('/api/project-upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upload failed with server error:', errorData);
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const data = await response.json();
    console.log('Upload successful:', data);

    return {
      success: true,
      url: data.url,
    };
  } catch (error) {
    console.error('Error uploading project image:', error);
    throw error;
  }
}

/**
 * Remove a project image
 * This doesn't actually delete the file for safety but can be expanded to do so
 * @param projectId ID of the project
 * @param imagePath Path of the image to remove
 */
export async function removeProjectImage(
  projectId: string,
  imagePath: string
): Promise<void> {
  // Currently just logs the removal - could be expanded to actually delete files
  console.log(`Would remove image ${imagePath} from project ${projectId}`);
  
  // For now, we'll let the frontend handle image removal from the interface
  // and rely on project updates to persist the removal in the database
} 
'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { IMAGE_FRAMES, validateImageFile } from '@/lib/image-frames';

interface DirectProjectImageUploaderProps {
  projectId: string;
  projectSlug: string;
  sectionIndex: number;
  imageIndex: number;
  currentImageUrl: string | null;
  onSuccess: (url: string) => void;
  onError: (error: string) => void;
}

export default function DirectProjectImageUploader({
  projectId,
  projectSlug,
  sectionIndex,
  imageIndex,
  currentImageUrl,
  onSuccess,
  onError
}: DirectProjectImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { requestCrop, cutboard } = useImageCutboard();
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setErrorMessage(invalid);
      onError(invalid);
      return;
    }
    const cropped = await requestCrop(file, IMAGE_FRAMES.projectSection);
    if (!cropped) return;

    setUploading(true);
    setUploadSuccess(false);
    setErrorMessage('');
    setImageError(false);
    
    console.log(`Starting upload for project=${projectId}, section=${sectionIndex}, imageIndex=${imageIndex}`);

    try {
      // Create a form data object for the upload
      const formData = new FormData();
      formData.append('file', cropped);
      formData.append('projectId', projectId);
      formData.append('projectSlug', projectSlug);
      formData.append('imageType', `section-${sectionIndex}-image-${imageIndex}`);
      
      console.log(`FormData prepared with imageType=section-${sectionIndex}-image-${imageIndex}`);

      // Upload the file
      console.log('Sending upload request to /api/project-upload');
      const uploadResponse = await fetch('/api/project-upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('Upload response not OK:', errorData);
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success) {
        console.error('Upload data indicates failure:', uploadData);
        throw new Error(uploadData.error || 'Upload failed');
      }

      console.log('File upload successful:', JSON.stringify(uploadData, null, 2));
      
      // Now save the image to the database directly using our debug endpoint
      console.log(`Saving image to database via /api/debug-save-image with projectId=${projectId}, sectionIndex=${sectionIndex}`);
      const dbSaveResponse = await fetch('/api/debug-save-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          sectionIndex,
          imagePath: uploadData.url
        })
      });
      
      console.log('Database save response received');

      const dbSaveResult = await dbSaveResponse.json();
      
      if (!dbSaveResult.success) {
        console.error('Database save failed:', dbSaveResult);
        throw new Error(dbSaveResult.error || 'Failed to save image to database');
      }
      
      console.log('Database save successful:', dbSaveResult);
      
      // Update UI
      setPreviewUrl(uploadData.url);
      setUploadSuccess(true);
      setUploading(false);
      
      // Call the success callback with the new URL
      onSuccess(uploadData.url);
      
    } catch (err: unknown) {
      console.error('Error during upload process:', err);
      const message = err instanceof Error ? err.message : 'An error occurred during upload';
      setErrorMessage(message);
      setUploading(false);
      onError(message);
    }
  };

  const handleImageError = () => {
    console.error(`Failed to load image: ${previewUrl}`);
    
    // Simply mark as error when image fails to load
    setImageError(true);
  };

  return (
    <>
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Image Preview */}
      <AdminHoverPreview src={previewUrl && !imageError ? previewUrl : null} className="block">
      <div className={`${IMAGE_FRAMES.projectSection.className} relative bg-gray-100`}>
        {previewUrl && !imageError ? (
          <Image 
            src={previewUrl}
            alt={`Section ${sectionIndex + 1} Image ${imageIndex + 1}`}
            fill
            className="object-cover"
            onError={handleImageError}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-4">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                {imageError ? 'Failed to load image' : 'No image uploaded'}
              </p>
              {imageError && previewUrl && (
                <p className="mt-1 text-xs text-red-500">Path: {previewUrl}</p>
              )}
            </div>
          </div>
        )}
      </div>
      </AdminHoverPreview>
      
      {/* Upload Button */}
      <div className="p-3 border-t">
        <label className="block cursor-pointer">
          <div className={`bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center ${uploading ? 'opacity-75' : ''}`}>
            {uploading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : uploadSuccess ? (
              <svg className="-ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="-ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            {uploading ? 'Uploading...' : uploadSuccess ? 'Uploaded!' : previewUrl ? 'Replace Image' : 'Upload Image'}
          </div>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
        
        {errorMessage && (
          <div className="mt-2 text-xs text-red-600">
            Error: {errorMessage}
          </div>
        )}
      </div>
    </div>
    {cutboard}
    </>
  );
} 
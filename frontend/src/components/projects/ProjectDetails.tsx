'use client';

import React from 'react';
import { safeHttpUrl } from '@/lib/safe-http-url';

interface ProjectDetailsProps {
  photography?: string;
  client?: string;
  architect?: string;
  interiorDesigner?: string;
  lightingDesigner?: string;
  place?: string;
  country?: string;
  date?: string;
  exhibitionDesign?: Array<{
    company: string;
    galleries: string[];
  }>;
  mapLink?: string;
}

export default function ProjectDetails({
  photography,
  client,
  architect,
  interiorDesigner,
  lightingDesigner,
  place,
  country,
  date,
  exhibitionDesign = [],
  mapLink
}: ProjectDetailsProps) {
  const safeMap = safeHttpUrl(mapLink);
  // Debug log to see what props are being received
  console.log('ProjectDetails component received props:', {
    photography,
    client,
    architect,
    interiorDesigner,
    lightingDesigner,
    place,
    country,
    date,
    exhibitionDesignCount: exhibitionDesign?.length || 0,
    hasMapLink: !!mapLink
  });
  
  // Check if a value exists and is not empty
  const hasValue = (value: string | undefined): boolean => {
    return !!value && value.trim() !== '' && value.toLowerCase() !== 'not specified';
  };
  
  // Check if exhibition design has valid data
  const hasExhibitionDesign = exhibitionDesign && exhibitionDesign.length > 0;
  
  return (
    <div className="bg-white text-gray-800 p-6">
      <div className="grid grid-cols-1 gap-y-2 text-sm">
        {/* Photography section */}
        {hasValue(photography) && (
          <div className="grid grid-cols-[150px_1fr] items-start">
            <span className="font-medium">Photography:</span>
            <span>{photography}</span>
          </div>
        )}
        
        {/* Exhibition Design section - only for Shanghai Museum */}
        {hasExhibitionDesign && (
          <div className="mb-4">
            <div className="font-medium mb-2">Exhibition Design:</div>
            {exhibitionDesign.map((design, index) => (
              <div key={index} className="ml-0 text-gray-700 mb-1">
                {design.company} ({design.galleries.join(', ')})
              </div>
            ))}
          </div>
        )}
        
        {/* Project team section */}
        {hasValue(client) && (
          <div className="grid grid-cols-[150px_1fr] items-start">
            <span className="font-medium">Client:</span>
            <span>{client}</span>
          </div>
        )}
        
        {hasValue(architect) && (
          <div className="grid grid-cols-[150px_1fr] items-start">
            <span className="font-medium">Architect:</span>
            <span>{architect}</span>
          </div>
        )}
        
        {hasValue(interiorDesigner) && (
          <div className="grid grid-cols-[150px_1fr] items-start">
            <span className="font-medium">Interior Designer:</span>
            <span>{interiorDesigner}</span>
          </div>
        )}
        
        {hasValue(lightingDesigner) && (
          <div className="grid grid-cols-[150px_1fr] items-start mb-4">
            <span className="font-medium">Lighting Designer:</span>
            <span>{lightingDesigner}</span>
          </div>
        )}
        
        {/* Location and date section */}
        {hasValue(place) && (
          <div className="grid grid-cols-[150px_1fr] items-start">
            <span className="font-medium">Place:</span>
            <span>{place}</span>
          </div>
        )}
        
        {hasValue(country) && (
          <div className="grid grid-cols-[150px_1fr] items-start">
            <span className="font-medium">Country:</span>
            <span>{country}</span>
          </div>
        )}
        
        {hasValue(date) && (
          <div className="grid grid-cols-[150px_1fr] items-start">
            <span className="font-medium">On:</span>
            <span>{date}</span>
          </div>
        )}
        
        {/* Map link */}
        {safeMap && (
          <div className="mt-3">
            <a 
              href={safeMap} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Project in Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 
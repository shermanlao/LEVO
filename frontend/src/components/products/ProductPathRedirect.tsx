'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProductPathRedirectProps {
  type: string;
  series: string;
  slug: string;
}

/**
 * Client-side component that redirects to the correct product path
 * Used when we detect that a product is being accessed via unknown-category/unknown-series placeholders
 */
export default function ProductPathRedirect({ type, series, slug }: ProductPathRedirectProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  // Construct the correct URL outside useEffect to avoid issues
  const correctUrl = `/products/${type}/${series}/${slug}`;
  
  useEffect(() => {
    console.log(`ProductPathRedirect - Redirecting to correct URL: ${correctUrl}`);
    
    try {
      // Use a simple window.location instead of the router for more reliable redirect
      if (typeof window !== 'undefined') {
        // Set a short delay to allow the component to render properly first
        const redirectTimer = setTimeout(() => {
          window.location.href = correctUrl;
        }, 100);
        
        return () => clearTimeout(redirectTimer);
      } else {
        // Fallback to router if window is not available (SSR)
        router.push(correctUrl);
      }
      
      // Set a timeout to prevent infinite loading if redirection fails
      const timeoutTimer = setTimeout(() => {
        setIsRedirecting(false);
      }, 3000);
      
      return () => clearTimeout(timeoutTimer);
    } catch (error) {
      console.error('Error during redirection:', error);
      setIsRedirecting(false);
    }
  }, [correctUrl, router]);
  
  // Show a loading indicator while redirecting
  if (isRedirecting) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to correct product page...</p>
        <p className="text-sm text-gray-500 mt-2">If you are not redirected automatically, please click <Link href={correctUrl} className="text-blue-500 underline">here</Link></p>
      </div>
    );
  }
  
  // Show a fallback message if redirection fails
  return (
    <div className="container mx-auto py-16 px-4 text-center">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Redirect failed. Please try <a href={correctUrl} className="font-medium underline hover:text-yellow-600">clicking here</a> to navigate to the product page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Category page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="bg-red-50 p-8 rounded-lg border border-red-200 text-center">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Failed to Load Category
        </h2>
        <p className="text-gray-700 mb-6">
          We're having trouble loading this category. This might be because:
        </p>
        <ul className="text-gray-700 list-disc list-inside mb-6">
          <li>The backend API might be unavailable</li>
          <li>The category might not exist</li>
          <li>There might be an issue with the data</li>
        </ul>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => reset()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
          <Link
            href="/products"
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Back to Categories
          </Link>
        </div>
      </div>
    </div>
  );
} 
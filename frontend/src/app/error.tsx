'use client';

import { useEffect } from 'react';
import { HelpLink } from '@/components/admin/HelpButton';
import HelpButton from '@/components/admin/HelpButton';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-700 mb-6">
          The page could not be loaded. Try again, or return to the LEVO Lighting homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <HelpButton
            helpKey="catalog.error.retry"
            type="button"
            onClick={() => reset()}
            className="btn-primary"
          >
            Try again
          </HelpButton>
          <HelpLink href="/" helpKey="catalog.error.home" className="btn-secondary inline-flex justify-center">
            Home
          </HelpLink>
        </div>
      </div>
    </div>
  );
}

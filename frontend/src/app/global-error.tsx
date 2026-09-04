'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div style={{ maxWidth: 640, margin: '48px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ marginBottom: 24 }}>The site could not be loaded. Please try again.</p>
          <button
            type="button"
            onClick={() => reset()}
            data-help-key="catalog.error.retry"
            style={{ background: '#000', color: '#fff', padding: '8px 16px', border: 0, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

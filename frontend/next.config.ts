import type { NextConfig } from 'next';

const publicReadPaths = [
  '/api/product-media',
  '/api/product-media/:path*',
  '/api/help-tips',
  '/api/help-tips/:path*',
  '/uploads',
  '/uploads/:path*',
];

function publicOriginIsHttps(): boolean {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_ORIGIN || '';
  return origin.startsWith('https://');
}

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    localPatterns: [
      { pathname: '/hero-image.jpg' },
      { pathname: '/product-placeholder.jpg' },
      { pathname: '/images/**' },
      { pathname: '/uploads/**' },
      { pathname: '/api/product-media/**' },
    ],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '1337', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '3333', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'localhost', port: '', pathname: '/**' },
      { protocol: 'http', hostname: 'lightx.synology.me', pathname: '/**' },
      { protocol: 'https', hostname: 'lightx.synology.me', pathname: '/**' },
    ],
  },
  experimental: {
    optimizeCss: true,
  },
  async redirects() {
    return [{ source: '/about', destination: '/contact', permanent: false }];
  },
  async headers() {
    const imageCache = [
      { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
    ];
    const security = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
          "img-src 'self' data: blob: https://lightx.synology.me http://lightx.synology.me",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "connect-src 'self'",
          "worker-src 'self' blob:",
        ].join('; '),
      },
    ];
    if (publicOriginIsHttps()) {
      security.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }
    return [
      { source: '/:path*', headers: security },
      { source: '/images/products/:path*', headers: imageCache },
      { source: '/images/ai/:path*', headers: imageCache },
      { source: '/images/site/:path*', headers: imageCache },
    ];
  },
  async rewrites() {
    // fallback: only if no Next route matches. afterFiles would steal POST
    // from GET-only App Router handlers and forward mutations to Express.
    return {
      fallback: publicReadPaths.map((source) => ({
        source,
        destination: `http://127.0.0.1:3333${source}`,
      })),
    };
  },
};

export default nextConfig;

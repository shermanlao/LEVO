import type { NextConfig } from 'next';

const publicReadPaths = [
  '/api/contact',
  '/api/contact/:path*',
  '/api/datasheets',
  '/api/datasheets/:path*',
  '/api/series',
  '/api/series/:path*',
  '/api/labels',
  '/api/labels/:path*',
  '/api/product-media',
  '/api/product-media/:path*',
  '/api/help-tips',
  '/api/help-tips/:path*',
  '/uploads',
  '/uploads/:path*',
];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
    return [
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

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile lucide-react to fix vendor chunk issues in Next.js 15
  transpilePackages: ['lucide-react'],
  // Optimize package imports
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Cache-Control headers for static assets
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Serve generated icon at /favicon.ico and locale-prefixed paths (browsers may request these)
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/icon' },
      { source: '/de/icon', destination: '/icon' },
      { source: '/en/icon', destination: '/icon' },
    ];
  },
};

export default withNextIntl(nextConfig);

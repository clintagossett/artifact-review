/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const convexHttpUrl = process.env.NEXT_PUBLIC_CONVEX_HTTP_URL || process.env.CONVEX_SITE_URL;

    if (!convexHttpUrl) {
      console.warn('⚠️  NEXT_PUBLIC_CONVEX_HTTP_URL not set - API routes will not work');
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${convexHttpUrl}/api/v1/:path*`,
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Exclude test artifacts and build directories from file watching
    // Prevents Fast Refresh from triggering during E2E test runs
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/coverage/**',
        '**/.turbo/**',
      ],
    };
    return config;
  },
};

export default nextConfig;

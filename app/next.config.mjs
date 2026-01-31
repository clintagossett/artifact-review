/** @type {import('next').NextConfig} */
const nextConfig = {
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

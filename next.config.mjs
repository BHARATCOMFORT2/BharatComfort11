/** @type {import('next').NextConfig} */
const nextConfig = {
  // Run all routes at runtime – disables static export of /api/*
  output: 'standalone',
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
  // Disable static optimization of any route
  dynamicParams: true,
  reactStrictMode: false,

  // Tell Next: everything is dynamic
  generateStaticParams: async () => [],
  dynamicIO: true,
  compress: true,

  // Netlify / Firebase compatible node runtime
  env: {
    NEXT_DYNAMIC_NO_WARNING: 'true',
  },
};

export default nextConfig;

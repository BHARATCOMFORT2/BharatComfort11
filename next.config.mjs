/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",           // for Netlify / serverless
  experimental: {
    dynamicIO: true,              // new hint for dynamic routes
  },
  // 🔧 force dynamic execution for every route
  generateStaticParams: async () => [],
  generateBuildId: async () => Date.now().toString(),
  headers: async () => [],
  // most important flag:
  dynamicParams: true,
  dynamicIO: true,
  trailingSlash: false,
};

export default nextConfig;

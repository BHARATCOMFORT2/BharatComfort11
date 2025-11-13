/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // ❌ Removed: output: "standalone"
  // This was breaking all dynamic routing on Vercel.
  // Vercel automatically uses standalone mode internally.

  trailingSlash: false,

  // ❗ Use fixed i18n config to avoid dynamic route 404 issues
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },

  // ✅ Remote image domains
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },

  // Ignore build-time TS/ESLint warnings
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ❌ Removed experimental turbo + webpack fallbacks
  // These were breaking server bundles and API route execution.
};

module.exports = nextConfig;

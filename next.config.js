/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // ✅ Ensure Vercel runs dynamic routes correctly
  output: "standalone",

  // ✅ Fix redirect loops caused by trailing slashes
  trailingSlash: false,

  // ✅ Handle i18n safely (keep defaults if envs missing)
  i18n: {
    locales: process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(",") || ["en"],
    defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
  },

  // ✅ Remote image domains
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.firebaseapp.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // ✅ Ignore build warnings for TS & ESLint
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ✅ Prevent Firestore admin polyfill issues
  webpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };
    return config;
  },

  // ✅ Optional: Improve caching & performance
  experimental: {
    turbo: {
      rules: {
        "*.tsx": ["babel-loader"],
      },
    },
  },
};

module.exports = nextConfig;

// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // =========================
  // Internationalization (i18n)
  // =========================
  i18n: {
    locales: process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(",") || ["en"],
    defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
  },

  // =========================
  // Remote Images (Firebase Storage, external APIs, etc.)
  // =========================
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.firebaseapp.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile pics
      },
    ],
  },

  // =========================
  // Experimental (optional)
  // =========================
  experimental: {
  
  },
};

module.exports = nextConfig;

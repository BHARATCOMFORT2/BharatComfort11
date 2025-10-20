/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  i18n: {
    locales: process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(",") || ["en"],
    defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.firebaseapp.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" }, // ✅ for Firebase Storage images
      { protocol: "https", hostname: "via.placeholder.com" }, // ✅ for placeholder fallback
      { protocol: "https", hostname: "images.unsplash.com" }, // ✅ optional: Unsplash support
    ],
  },
};

module.exports = nextConfig;

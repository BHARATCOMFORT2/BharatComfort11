"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative h-[90vh] flex items-center justify-center text-center px-6">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80')",
        }}
      />

      {/* Glassy Overlay */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-lg" />

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-3xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-yellow-800 drop-shadow-lg">
          Discover Comfort in Every Journey
        </h1>
        <p className="text-lg md:text-xl text-yellow-700/80 mb-8">
          Your trusted partner for travel, stays, and memorable experiences.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/listings"
            className="px-6 py-3 bg-yellow-700 text-white font-semibold rounded-xl shadow-lg hover:bg-yellow-600 transition-all"
          >
            Explore Listings
          </a>
          <a
            href="/about"
            className="px-6 py-3 bg-white/40 text-yellow-900 font-semibold rounded-xl shadow-lg hover:bg-white/50 transition-all"
          >
            Learn More
          </a>
        </div>
      </motion.div>
    </section>
  );
}

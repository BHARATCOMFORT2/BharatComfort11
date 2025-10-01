"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Hero from "@/components/home/Hero";
import QuickActionStrip from "@/components/home/QuickActionStrip";
import FeaturedListings from "@/components/home/FeaturedListings";
import PromotionsStrip from "@/components/home/PromotionsStrip";
import RecentStories from "@/components/home/RecentStories";
import TrendingDestinations from "@/components/home/TrendingDestinations";
import Testimonials from "@/components/home/Testimonials";
import NewsletterSignup from "@/components/home/NewsletterSignup";
import Footer from "@/components/home/Footer";

export default function HomePage() {
  return (
    <main className="bg-gradient-to-br from-[#0a0f29] to-[#1e3a8a] text-white min-h-screen">
      {/* Hero Section */}
      <section className="relative">
        <Hero />
        <div className="absolute inset-0 bg-black/40" /> {/* overlay */}
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-5xl font-bold text-yellow-400 drop-shadow-lg">
              Welcome to BharatComfort
            </h1>
            <p className="mt-4 text-lg text-gray-200">
              Discover Royal Journeys Across India
            </p>
            <Link
              href="/explore"
              className="mt-6 inline-block px-6 py-3 rounded-xl bg-yellow-400 text-black font-semibold shadow-lg hover:bg-yellow-500 transition"
            >
              Explore Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions */}
      <motion.section
        className="py-10 container mx-auto"
        initial={{ opacity: 0, x: -60 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <QuickActionStrip />
      </motion.section>

      {/* Featured Listings */}
      <motion.section
        className="py-10 container mx-auto"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Featured Trips</h2>
        <FeaturedListings />
      </motion.section>

      {/* Promotions */}
      <motion.section
        className="py-10 container mx-auto bg-white/10 rounded-2xl shadow-xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <PromotionsStrip />
      </motion.section>

      {/* Trending Destinations */}
      <motion.section
        className="py-10 container mx-auto"
        initial={{ opacity: 0, x: 60 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Trending Destinations</h2>
        <TrendingDestinations />
      </motion.section>

      {/* Stories */}
      <motion.section
        className="py-10 container mx-auto"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <RecentStories />
      </motion.section>

      {/* Testimonials */}
      <motion.section
        className="py-10 container mx-auto bg-white/10 rounded-2xl shadow-xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <Testimonials />
      </motion.section>

      {/* Newsletter */}
      <motion.section
        className="py-10 container mx-auto text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <NewsletterSignup />
      </motion.section>

      {/* Footer */}
      <Footer />
    </main>
  );
}

"use client";

import Link from "next/link";
import Hero from "@/components/home/Hero";
import QuickActionStrip from "@/components/home/QuickActionStrip";
import FeaturedListings from "@/components/home/FeaturedListings";
import PromotionsStrip from "@/components/home/PromotionsStrip";
import RecentStories from "@/components/home/RecentStories";
import TrendingDestinations from "@/components/home/TrendingDestinations";
import Testimonials from "@/components/home/Testimonials";
import NewsletterSignup from "@/components/home/NewsletterSignup";

export default function HomePage() {
  return (
    <main className="bg-gradient-to-br from-[#0a0f29] to-[#1e3a8a] text-white min-h-screen">
      {/* Hero Section */}
      <section className="relative">
        <Hero />
        <div className="absolute inset-0 bg-black/40" /> {/* overlay */}
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
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
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-10 container mx-auto">
        <QuickActionStrip />
      </section>

      {/* Featured Listings */}
      <section className="py-10 container mx-auto">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Featured Trips</h2>
        <FeaturedListings />
      </section>

      {/* Promotions */}
      <section className="py-10 container mx-auto bg-white/10 rounded-2xl shadow-xl">
        <PromotionsStrip />
      </section>

      {/* Trending Destinations */}
      <section className="py-10 container mx-auto">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">Trending Destinations</h2>
        <TrendingDestinations />
      </section>

      {/* Stories */}
      <section className="py-10 container mx-auto">
        <RecentStories />
      </section>

      {/* Testimonials */}
      <section className="py-10 container mx-auto bg-white/10 rounded-2xl shadow-xl">
        <Testimonials />
      </section>

      {/* Newsletter */}
      <section className="py-10 container mx-auto text-center">
        <NewsletterSignup />
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0f29] py-8 text-center border-t border-yellow-400/30">
        <p className="text-gray-300">
          © {new Date().getFullYear()} BharatComfort —{" "}
          <span className="text-yellow-400">Royal Comforts of India</span>
        </p>
      </footer>
    </main>
  );
}

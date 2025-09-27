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
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80')",
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="text-center py-20 px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
            Discover Hotels, Restaurants & Travel Experiences
          </h1>
          <p className="mt-4 text-lg text-gray-200 max-w-2xl mx-auto">
            BharatComfort is your global platform to explore and book the best places.
          </p>

          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/listings"
              className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg shadow hover:bg-orange-600 transition"
            >
              Explore Listings
            </Link>
            <Link
              href="/auth/register"
              className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg shadow hover:bg-gray-100 transition"
            >
              Join Now
            </Link>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6 pb-12">
          {[
            { label: "Flights", icon: "✈️" },
            { label: "Trains", icon: "🚆" },
            { label: "Buses", icon: "🚌" },
            { label: "Support", icon: "📞" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white/90 rounded-xl shadow p-6 text-center hover:shadow-lg transition"
            >
              <div className="text-3xl">{item.icon}</div>
              <p className="mt-2 font-semibold text-gray-800">{item.label}</p>
            </div>
          ))}
        </section>

        {/* Featured Listings */}
        <section className="bg-white/95 py-12">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
              🌟 Featured Listings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Card 1 */}
              <div className="card">
                <h3 className="text-xl font-semibold">Luxury Hotel Mumbai</h3>
                <p className="text-gray-600">Mumbai, India</p>
                <p className="text-gray-800 font-bold mt-2">₹5000/night</p>
                <div className="mt-4 flex gap-3">
                  <Link href="/listings/1" className="btn btn-primary">
                    View
                  </Link>
                  <button className="btn btn-accent">Book Now</button>
                </div>
              </div>

              {/* Promotions / Spot Discounts */}
      <section className="container mx-auto px-4">
        <PromotionsStrip />
      </section>

      {/* Recent Stories */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <RecentStories />
        </div>
      </section>

      {/* Trending Destinations */}
      <section className="container mx-auto px-4">
        <TrendingDestinations />
      </section>

      {/* Testimonials */}
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <Testimonials />
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="bg-indigo-600 text-white py-16">
        <div className="container mx-auto px-4">
          <NewsletterSignup />
        </div>
      </section>
              {/* Card 2 */}
              <div className="card">
                <h3 className="text-xl font-semibold">Beach Resort Goa</h3>
                <p className="text-gray-600">Goa, India</p>
                <p className="text-gray-800 font-bold mt-2">₹7000/night</p>
                <div className="mt-4 flex gap-3">
                  <Link href="/listings/2" className="btn btn-primary">
                    View
                  </Link>
                  <button className="btn btn-accent">Book Now</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );


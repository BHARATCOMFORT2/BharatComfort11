"use client";

import Link from "next/link";
import { Plane, Train, Bus, Headphones, MapPin, Facebook, Twitter, Instagram } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ NAVBAR */}
      <header className="fixed top-0 left-0 w-full bg-white shadow z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            BharatComfort
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex gap-6 text-gray-700 font-medium">
            <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
            <Link href="/listings" className="hover:text-indigo-600 transition">Listings</Link>
            <Link href="/stories" className="hover:text-indigo-600 transition">Stories</Link>
            <Link href="/partners" className="hover:text-indigo-600 transition">Partners</Link>
            <Link href="/about" className="hover:text-indigo-600 transition">About</Link>
          </nav>

          {/* Actions */}
          <div className="flex gap-4">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition text-sm font-medium"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* ✅ HERO */}
      <section
        className="relative min-h-[80vh] flex flex-col justify-center items-center text-center bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 px-6 mt-20">
          <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">
            Discover Hotels, Restaurants & Travel Experiences
          </h1>
          <p className="mt-6 text-lg text-gray-200 max-w-2xl mx-auto">
            BharatComfort is your trusted platform to explore and book the best places worldwide.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/listings"
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition"
            >
              Explore Listings
            </Link>
            <Link
              href="/auth/register"
              className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg shadow hover:bg-gray-100 transition"
            >
              Join Now
            </Link>
          </div>
        </div>
      </section>

      {/* ✅ QUICK ACTIONS */}
      <section className="py-20 bg-gradient-to-r from-indigo-50 to-indigo-100">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6">
          {[
            { label: "Flights", icon: Plane },
            { label: "Trains", icon: Train },
            { label: "Buses", icon: Bus },
            { label: "Support", icon: Headphones },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl shadow p-6 text-center hover:shadow-lg transition"
            >
              <item.icon className="mx-auto h-10 w-10 text-indigo-600" />
              <p className="mt-3 font-semibold text-gray-800">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ✅ FEATURED LISTINGS */}
      <section
        className="py-20 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1501117716987-c8e1ecb2105d?auto=format&fit=crop&w=1920&q=80')",
        }}
      >
        <div className="bg-white/90 rounded-2xl shadow-lg max-w-6xl mx-auto px-8 py-12">
          <h2 className="text-3xl font-bold mb-10 text-gray-900 flex items-center gap-2">
            🌟 Featured Listings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Luxury Hotel Mumbai",
                location: "Mumbai, India",
                price: "₹5000/night",
                href: "/listings/1",
              },
              {
                title: "Beach Resort Goa",
                location: "Goa, India",
                price: "₹7000/night",
                href: "/listings/2",
              },
            ].map((listing) => (
              <div
                key={listing.title}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900">{listing.title}</h3>
                <p className="text-gray-600">{listing.location}</p>
                <p className="text-indigo-600 font-bold mt-2">{listing.price}</p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href={listing.href}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg shadow hover:bg-indigo-700 transition"
                  >
                    View
                  </Link>
                  <button className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg shadow hover:bg-orange-600 transition">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ TRENDING DESTINATIONS */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-10 text-gray-900 flex items-center gap-2">
            🌍 Trending Destinations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[
              {
                name: "Jaipur",
                image:
                  "https://images.unsplash.com/photo-1583241805912-1c55d26abf72?auto=format&fit=crop&w=800&q=80",
              },
              {
                name: "Bali",
                image:
                  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
              },
              {
                name: "New York",
                image:
                  "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?auto=format&fit=crop&w=800&q=80",
              },
            ].map((dest) => (
              <div
                key={dest.name}
                className="relative rounded-xl overflow-hidden shadow-lg group"
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="h-56 w-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <p className="text-white text-2xl font-bold">{dest.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ TESTIMONIALS */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-10 text-gray-900 text-center">
            💬 What Our Travelers Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Aditi Sharma",
                text: "Booking with BharatComfort was super easy! I found amazing hotels at the best prices.",
                avatar: "https://randomuser.me/api/portraits/women/44.jpg",
              },
              {
                name: "Rahul Verma",
                text: "Great platform for travel planning – smooth, fast, and reliable.",
                avatar: "https://randomuser.me/api/portraits/men/32.jpg",
              },
              {
                name: "Sophia Lee",
                text: "I booked my Bali trip here, and everything was just perfect. Highly recommend!",
                avatar: "https://randomuser.me/api/portraits/women/68.jpg",
              },
            ].map((review) => (
              <div
                key={review.name}
                className="bg-gray-50 p-6 rounded-xl shadow hover:shadow-md transition"
              >
                <img
                  src={review.avatar}
                  alt={review.name}
                  className="h-12 w-12 rounded-full mx-auto"
                />
                <p className="mt-4 text-gray-700 italic">“{review.text}”</p>
                <p className="mt-3 font-semibold text-gray-900 text-center">
                  {review.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ NEWSLETTER */}
      <section className="py-20 bg-indigo-600 text-white">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold">📧 Stay Updated</h2>
          <p className="mt-3 text-indigo-100">
            Subscribe to our newsletter and never miss out on exclusive deals & travel tips.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-4 py-3 rounded-lg w-full sm:w-80 text-gray-900 focus:outline-none"
            />
            <button className="px-6 py-3 bg-orange-500 rounded-lg shadow hover:bg-orange-600 transition font-semibold">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* ✅ FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-white">BharatComfort</h3>
            <p className="mt-3 text-sm">
              Your global partner for booking hotels, restaurants, and travel experiences.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white">Quick Links</h4>
            <ul className="mt-3 space-y-2">
              <li><Link href="/listings" className="hover:text-white">Listings</Link></li>
              <li><Link href="/stories" className="hover:text-white">Stories</Link></li>
              <li><Link href="/partners" className="hover:text-white">Partners</Link></li>
              <li><Link href="/about" className="hover:text-white">About</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-lg font-semibold text-white">Follow Us</h4>
            <div className="flex gap-4 mt-3">
              <Facebook className="h-6 w-6 hover:text-white cursor-pointer" />
              <Twitter className="h-6 w-6 hover:text-white cursor-pointer" />
              <Instagram className="h-6 w-6 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="text-center mt-8 text-sm text-gray-500">
          © {new Date().getFullYear()} BharatComfort. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

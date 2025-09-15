"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20 px-6 text-center">
      <h1 className="text-4xl md:text-6xl font-bold mb-4">
        Discover Hotels, Restaurants & Travel Experiences
      </h1>
      <p className="max-w-2xl mx-auto mb-8 text-lg">
        BharatComfort is your global platform to explore and book the best places.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/listings"
          className="px-6 py-3 rounded-xl bg-white text-blue-700 font-semibold hover:bg-gray-200"
        >
          Explore Listings
        </Link>
        <Link
          href="/auth/register"
          className="px-6 py-3 rounded-xl bg-yellow-400 text-black font-semibold hover:bg-yellow-500"
        >
          Join Now
        </Link>
      </div>
    </section>
  );
}

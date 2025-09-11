"use client";

import Link from "next/link";

export default function CTA() {
  return (
    <section className="bg-blue-600 text-white py-16 px-6 text-center">
      <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
      <p className="mb-6 text-lg">
        Join BharatComfort and start your journey with exclusive listings and deals.
      </p>
      <Link
        href="/auth/register"
        className="px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-500"
      >
        Get Started
      </Link>
    </section>
  );
}

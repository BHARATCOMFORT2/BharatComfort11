"use client";

import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-900 mb-4">About BharatComfort</h1>
        <p className="text-gray-700 text-lg">
          BharatComfort is your trusted platform for discovering unique stays, curated destinations, and seamless bookings across India.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-yellow-900">Our Mission</h2>
        <p className="text-gray-700">
          To make travel comfortable, safe, and memorable for every explorer across India.
        </p>

        <h2 className="text-2xl font-semibold text-yellow-900">Why Choose Us</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Verified stays & partners</li>
          <li>Easy online booking & payment</li>
          <li>Curated travel inspirations</li>
          <li>24/7 customer support</li>
        </ul>
      </section>

      <div className="text-center mt-8">
        <p className="text-gray-700 mb-4">Start exploring today!</p>
        <a
          href="/explore"
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition"
        >
          Explore Now
        </a>
      </div>
    </motion.div>
  );
}

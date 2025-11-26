"use client";

import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto space-y-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-yellow-900 mb-4">
          About BHARATCOMFORT
        </h1>
        <p className="text-gray-700 text-lg max-w-3xl mx-auto">
          Welcome to <strong>BHARATCOMFORT</strong> — your trusted travel
          companion for discovering, planning, and booking unforgettable
          journeys across India through roadways, railways, and airways.
        </p>
      </div>

      {/* Our Mission */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">Our Mission</h2>
        <p className="text-gray-700 leading-relaxed">
          To make travel comfortable, smart, and secure for every explorer
          across India — connecting travelers with verified partners and
          empowering local businesses through technology.
        </p>
      </section>

      {/* Our Vision */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">Our Vision</h2>
        <p className="text-gray-700 leading-relaxed">
          To build India’s most transparent, AI-powered travel ecosystem where
          every booking is seamless, every partner is verified, and every trip
          is memorable.
        </p>
      </section>

      {/* Why Choose Us */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">Why Choose Us</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>AI-powered travel planning (road, rail, air)</li>
          <li>Verified travel partners & KYC-approved listings</li>
          <li>Secure Razorpay payments & transparent settlements</li>
          <li>Real-time chat, booking, and cancellation management</li>
          <li>Partner and admin dashboards for smooth coordination</li>
          <li>24×7 customer support and dispute handling under SLA</li>
        </ul>
      </section>

      {/* Our Promise */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-yellow-900">Our Promise</h2>
        <p className="text-gray-700 leading-relaxed">
          We are committed to transparency, reliability, and user satisfaction.
          Whether you’re a traveler exploring new destinations or a partner
          offering your services, BHARATCOMFORT11 ensures comfort and trust at
          every step.
        </p>
      </section>

      {/* CTA */}
      <div className="text-center mt-8">
        <p className="text-gray-700 mb-4 text-lg">
          Start exploring India’s best travel experiences today!
        </p>
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

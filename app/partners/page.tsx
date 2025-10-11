"use client";

import { motion } from "framer-motion";

export default function PartnersPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold text-yellow-900 text-center mb-6">Become a Partner</h1>
      <p className="text-gray-700 text-center mb-6">
        Join BharatComfort as a verified partner and list your stays to millions of travelers across India.
      </p>
      <div className="bg-white p-6 rounded-2xl shadow-md space-y-4">
        <h2 className="text-2xl font-semibold text-yellow-900">Benefits</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Reach thousands of travelers</li>
          <li>Secure payment & booking system</li>
          <li>Dedicated partner support</li>
          <li>Verified listing badge</li>
        </ul>
        <div className="text-center mt-4">
          <a
            href="/partner-signup"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition"
          >
            Sign Up Now
          </a>
        </div>
      </div>
    </motion.div>
  );
}

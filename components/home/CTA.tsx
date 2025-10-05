"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function CTA() {
  return (
    <motion.section
      className="py-16 px-6 text-center max-w-4xl mx-auto rounded-2xl bg-white/40 backdrop-blur-lg shadow-xl"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-4">
        Ready to Explore?
      </h2>
      <p className="mb-6 text-lg text-yellow-700/80">
        Join BharatComfort and start your journey with exclusive listings and deals.
      </p>
      <Link
        href="/auth/register"
        className="px-6 py-3 bg-yellow-700 text-white rounded-xl font-semibold shadow-lg hover:bg-yellow-600 transition-all"
      >
        Get Started
      </Link>
    </motion.section>
  );
}

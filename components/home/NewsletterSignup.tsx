"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Subscribed with ${email}`);
    setEmail("");
  };

  return (
    <motion.section
      className="py-16 bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd]"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-3xl mx-auto px-6 text-center rounded-2xl bg-white/40 backdrop-blur-lg shadow-xl p-10">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-4">
          Stay Updated
        </h2>
        <p className="text-yellow-700/80 mb-8">
          Get the latest offers, travel guides, and premium deals directly in your inbox.
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="px-4 py-3 rounded-xl w-full sm:w-96 border border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
          />
          <motion.button
            type="submit"
            className="px-6 py-3 bg-yellow-700 text-white font-semibold rounded-xl shadow-lg hover:bg-yellow-600 transition-all"
            whileHover={{ scale: 1.05 }}
          >
            Subscribe
          </motion.button>
        </form>
      </div>
    </motion.section>
  );
}

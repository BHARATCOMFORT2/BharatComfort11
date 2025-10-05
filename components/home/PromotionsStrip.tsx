"use client";

import { motion } from "framer-motion";

export default function PromotionsStrip() {
  return (
    <motion.section
      className="py-16 px-6 bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl max-w-7xl mx-auto text-center"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-4">
        Special Festival Offers 🎉
      </h2>
      <p className="text-xl text-yellow-700 mb-6">
        Save up to <span className="font-bold text-yellow-900">40%</span> on bookings this season!
      </p>
      <motion.a
        href="/promotions"
        className="relative inline-block px-8 py-4 bg-yellow-700 text-white font-semibold rounded-2xl shadow-lg overflow-hidden group"
        whileHover={{ scale: 1.05 }}
      >
        <span className="relative z-20">Grab Deal</span>
        {/* Shimmer effect */}
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 transform -translate-x-full group-hover:opacity-80"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        />
        {/* Hover glow */}
        <span className="absolute inset-0 rounded-2xl shadow-lg shadow-yellow-500/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
      </motion.a>
    </motion.section>
  );
}

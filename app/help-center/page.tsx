"use client";

import { motion } from "framer-motion";

const faqs = [
  { q: "How do I book a stay?", a: "Simply browse destinations or stays and click 'Book Now'." },
  { q: "Can I cancel a booking?", a: "Yes, cancellation policies depend on the partner." },
  { q: "Are the stays verified?", a: "All listed stays go through our verification process." },
];

export default function HelpCenterPage() {
  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6 max-w-4xl mx-auto space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold text-yellow-900 text-center mb-6">Help Center</h1>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="font-semibold text-lg">{faq.q}</h3>
            <p className="text-gray-700 mt-1">{faq.a}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

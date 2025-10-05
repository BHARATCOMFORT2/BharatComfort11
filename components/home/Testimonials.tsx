"use client";

import { motion } from "framer-motion";

export default function Testimonials() {
  const testimonials = [
    {
      name: "Aarav Sharma",
      role: "Business Traveler",
      feedback:
        "BharatComfort made my trip seamless. The luxury feel and smooth booking experience were unmatched!",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      name: "Priya Nair",
      role: "Travel Enthusiast",
      feedback:
        "Absolutely loved the curated destinations. The service felt premium and trustworthy!",
      image: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      name: "Rohan Verma",
      role: "Adventure Seeker",
      feedback:
        "From mountains to beaches, I found everything here. The deals are fantastic too!",
      image: "https://randomuser.me/api/portraits/men/56.jpg",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-12 text-center">
          What Our Travelers Say
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.name}
              className="relative rounded-2xl overflow-hidden shadow-xl border border-yellow-200/20 bg-white/40 backdrop-blur-lg p-6 text-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              whileHover={{ scale: 1.03 }}
            >
              <img
                src={t.image}
                alt={t.name}
                className="w-20 h-20 rounded-full mx-auto border-4 border-yellow-400 mb-4"
              />
              <p className="text-yellow-900 italic mb-4">"{t.feedback}"</p>
              <h3 className="font-semibold text-yellow-800">{t.name}</h3>
              <span className="text-yellow-700/80 text-sm">{t.role}</span>
              {/* Optional subtle gold glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-100/20 via-yellow-200/10 to-transparent opacity-0 hover:opacity-30 transition-opacity duration-500 pointer-events-none"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

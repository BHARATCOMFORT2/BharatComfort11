"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const demoStories = [
  { id: "1", title: "Exploring Goa’s Beaches", excerpt: "A perfect summer getaway..." },
  { id: "2", title: "Cultural Vibes of Jaipur", excerpt: "A royal experience awaits..." },
];

export default function TopStories() {
  return (
    <section className="py-16 bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-12 text-center">
          📰 Top Stories
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {demoStories.map((story, index) => (
            <motion.div
              key={story.id}
              className="relative rounded-2xl overflow-hidden shadow-xl border border-yellow-200/20 bg-white/40 backdrop-blur-lg p-6 hover:scale-105 transition cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
            >
              <h3 className="text-xl font-semibold text-yellow-900 mb-2">{story.title}</h3>
              <p className="text-yellow-700/80 text-sm mb-4">{story.excerpt}</p>
              <Link
                href={`/stories/${story.id}`}
                className="text-yellow-800 font-semibold hover:underline"
              >
                Read More →
              </Link>
              {/* Optional subtle gold overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-100/20 via-yellow-200/10 to-transparent opacity-0 hover:opacity-30 transition-opacity duration-500 pointer-events-none"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

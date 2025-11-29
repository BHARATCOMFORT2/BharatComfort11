"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

/* ------------------------------------------
   ✅ SAMPLE FALLBACK STORIES
------------------------------------------- */
const demoStories = [
  {
    id: "1",
    title: "Exploring Goa’s Beaches",
    excerpt: "A perfect summer getaway with golden sands and nightlife...",
  },
  {
    id: "2",
    title: "Cultural Vibes of Jaipur",
    excerpt: "A royal experience awaits with forts, food, and fairs...",
  },
  {
    id: "3",
    title: "Manali Adventure Guide",
    excerpt: "Snow treks, cafés, and riverside adventures...",
  },
  {
    id: "4",
    title: "Rishikesh Spiritual Escape",
    excerpt: "Yoga retreats, rafting, and peaceful ghats...",
  },
];

export default function TopStories() {
  const [stories, setStories] = useState<
    { id: string; title: string; excerpt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------
     🔥 Firestore Real-Time Fetch (WITH FALLBACK)
  ------------------------------------------- */
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "homepage", "topstories", "items"),
        (snap) => {
          if (!snap.empty) {
            setStories(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
            );
          } else {
            // ✅ Firestore empty → SAMPLE fallback
            setStories(demoStories);
          }
          setLoading(false);
        },
        (err) => {
          console.error("❌ TopStories Firestore error:", err);
          // ✅ Error → SAMPLE fallback
          setStories(demoStories);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("❌ TopStories Init failed:", err);
      setStories(demoStories);
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------
     🧠 Loading State
  ------------------------------------------- */
  if (loading) {
    return (
      <section className="py-16 text-center text-gray-500 italic animate-pulse">
        📰 Loading top stories...
      </section>
    );
  }

  /* ------------------------------------------
     🎨 Render (REAL or SAMPLE)
  ------------------------------------------- */
  return (
    <section className="py-16 bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-12 text-center">
          📰 Top Stories
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              className="relative rounded-2xl overflow-hidden shadow-xl border border-yellow-200/20 bg-white/40 backdrop-blur-lg p-6 hover:scale-105 transition cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
            >
              <h3 className="text-xl font-semibold text-yellow-900 mb-2">
                {story.title}
              </h3>

              <p className="text-yellow-700/80 text-sm mb-4">
                {story.excerpt}
              </p>

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

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

/* ------------------------------------------
   ✅ SAMPLE FALLBACK STORIES
------------------------------------------- */
const SAMPLE_STORIES = [
  {
    id: "S1",
    title: "Top 10 Beach Resorts in Goa",
    excerpt:
      "Explore the most luxurious and budget-friendly beach resorts in Goa for your perfect vacation.",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    link: "#",
  },
  {
    id: "S2",
    title: "Manali on a Budget",
    excerpt:
      "Affordable hotels, cafes, and travel hacks for a perfect trip to Manali.",
    imageUrl:
      "https://images.unsplash.com/photo-1544717305-2782549b5136",
    link: "#",
  },
  {
    id: "S3",
    title: "Jaipur Heritage Walk",
    excerpt:
      "Discover royal palaces, hidden streets, and food trails of the Pink City.",
    imageUrl:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41",
    link: "#",
  },
  {
    id: "S4",
    title: "Rishikesh Adventure Guide",
    excerpt:
      "River rafting, yoga retreats, and riverside cafés you must explore.",
    imageUrl:
      "https://images.unsplash.com/photo-1602339752474-36f0c7b63058",
    link: "#",
  },
  {
    id: "S5",
    title: "Udaipur Romantic Escapes",
    excerpt:
      "Lakeside resorts, candle-lit dinners, and royal experiences.",
    imageUrl:
      "https://images.unsplash.com/photo-1588416936097-41850ab3d86d",
    link: "#",
  },
  {
    id: "S6",
    title: "Shimla Café & Stay Guide",
    excerpt:
      "Best cafés, scenic stays, and Mall Road experiences in Shimla.",
    imageUrl:
      "https://images.unsplash.com/photo-1623074077480-4faff1c5e81a",
    link: "#",
  },
];

export default function RecentStories() {
  const [stories, setStories] = useState<
    { id: string; title: string; excerpt: string; imageUrl: string; link: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------
     🔥 Firestore Real-Time Fetch (WITH FALLBACK)
  ------------------------------------------- */
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "homepage", "recentstories", "items"),
        (snap) => {
          if (!snap.empty) {
            setStories(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
            );
          } else {
            // ✅ Firestore empty → SAMPLE fallback
            setStories(SAMPLE_STORIES);
          }
          setLoading(false);
        },
        (err) => {
          console.error("❌ RecentStories Firestore error:", err);
          // ✅ Firestore error → SAMPLE fallback
          setStories(SAMPLE_STORIES);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("❌ RecentStories Init failed:", err);
      setStories(SAMPLE_STORIES);
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------
     🧠 Loading State
  ------------------------------------------- */
  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 italic animate-pulse">
        📰 Loading latest travel stories...
      </div>
    );
  }

  /* ------------------------------------------
     🎨 Render (REAL or SAMPLE)
  ------------------------------------------- */
  return (
    <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 container mx-auto px-4">
      {stories.map((story, i) => (
        <motion.a
          href={story.link || "#"}
          key={story.id}
          className="block rounded-2xl overflow-hidden shadow-md bg-white hover:shadow-xl transition group"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          <div
            className="h-56 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
            style={{
              backgroundImage: `url(${
                story.imageUrl || "/placeholder-story.jpg"
              })`,
            }}
          ></div>

          <div className="p-5">
            <h3 className="text-xl font-semibold text-yellow-800">
              {story.title}
            </h3>
            <p className="text-gray-600 mt-2 line-clamp-3">
              {story.excerpt}
            </p>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

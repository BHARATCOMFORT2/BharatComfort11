"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase"; // ✅ use db directly
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";

interface Story {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
}

export default function RecentStories() {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const q = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(5));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Story)
        );
        setStories(data);
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    };

    fetchStories();
  }, []);

  if (stories.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd]">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-12 text-center">
          📰 Recent Stories & Experiences
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              className="relative rounded-2xl overflow-hidden shadow-xl border border-yellow-200/20 bg-white/40 backdrop-blur-lg cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              whileHover={{ scale: 1.03 }}
            >
              <Link href={`/stories/${story.id}`}>
                <img
                  src={story.imageUrl}
                  alt={story.title}
                  className="w-full h-48 object-cover rounded-t-2xl"
                />
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-yellow-900 mb-1">
                    {story.title}
                  </h3>
                  <p className="text-yellow-700/80 text-sm line-clamp-2">
                    {story.excerpt}
                  </p>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-100/20 via-yellow-200/10 to-transparent opacity-0 hover:opacity-30 transition-opacity duration-500 pointer-events-none"></div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

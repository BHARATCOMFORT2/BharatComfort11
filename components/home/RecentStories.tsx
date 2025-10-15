"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function RecentStories() {
  const [stories, setStories] = useState<
    { id: string; title: string; excerpt: string; imageUrl: string; link: string }[]
  >([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "recentstories", "items"),
      (snap) => {
        setStories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }
    );
    return () => unsub();
  }, []);

  if (stories.length === 0)
    return (
      <div className="text-center py-20 text-gray-500 italic">
        📰 No stories yet — check back soon!
      </div>
    );

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
            style={{ backgroundImage: `url(${story.imageUrl})` }}
          ></div>
          <div className="p-5">
            <h3 className="text-xl font-semibold text-yellow-800">
              {story.title}
            </h3>
            <p className="text-gray-600 mt-2 line-clamp-3">{story.excerpt}</p>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

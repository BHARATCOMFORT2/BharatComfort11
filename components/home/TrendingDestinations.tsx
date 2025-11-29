"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

/* ------------------------------------------
   ✅ SAMPLE FALLBACK DATA
------------------------------------------- */
const SAMPLE_TRENDING = [
  {
    id: "TD1",
    name: "Goa",
    description: "Beach resorts, nightlife & cafes",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  },
  {
    id: "TD2",
    name: "Manali",
    description: "Snow stays, riverside cafes & adventure",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136",
  },
  {
    id: "TD3",
    name: "Jaipur",
    description: "Royal palaces & heritage hotels",
    imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41",
  },
  {
    id: "TD4",
    name: "Udaipur",
    description: "Lakeside resorts & romantic stays",
    imageUrl: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d",
  },
  {
    id: "TD5",
    name: "Rishikesh",
    description: "Yoga retreats & river rafting",
    imageUrl: "https://images.unsplash.com/photo-1602339752474-36f0c7b63058",
  },
  {
    id: "TD6",
    name: "Shimla",
    description: "Colonial hill station & cafés",
    imageUrl: "https://images.unsplash.com/photo-1623074077480-4faff1c5e81a",
  },
];

export default function TrendingDestinations() {
  const [destinations, setDestinations] = useState<
    { id: string; name: string; description: string; imageUrl: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------
     🔥 Firestore Real-Time Fetch
  ------------------------------------------- */
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "homepage", "trending", "items"),
        (snap) => {
          if (!snap.empty) {
            setDestinations(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
            );
          } else {
            // ✅ Firestore empty → SAMPLE fallback
            setDestinations(SAMPLE_TRENDING);
          }
          setLoading(false);
        },
        (err) => {
          console.error("❌ Trending Firestore error:", err);
          // ✅ Firestore error → SAMPLE fallback
          setDestinations(SAMPLE_TRENDING);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("❌ Trending init failed:", err);
      setDestinations(SAMPLE_TRENDING);
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------
     🧠 Loading State
  ------------------------------------------- */
  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500 italic animate-pulse">
        🌄 Loading trending destinations...
      </div>
    );
  }

  /* ------------------------------------------
     🎨 Render (REAL or SAMPLE)
  ------------------------------------------- */
  return (
    <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 container mx-auto px-4">
      {destinations.map((dest, i) => (
        <motion.div
          key={dest.id}
          className="relative overflow-hidden rounded-2xl shadow-md group bg-white/50"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 0 + 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          <div
            className="h-64 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
            style={{
              backgroundImage: `url(${
                dest.imageUrl || "/placeholder-destination.jpg"
              })`,
            }}
          ></div>

          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition"></div>

          <div className="absolute bottom-0 p-6 text-white z-10">
            <h3 className="text-2xl font-bold drop-shadow-lg">
              {dest.name}
            </h3>
            <p className="text-sm mt-2 drop-shadow">
              {dest.description}
            </p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

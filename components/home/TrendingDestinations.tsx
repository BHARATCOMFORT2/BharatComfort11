"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function TrendingDestinations() {
  const [destinations, setDestinations] = useState<
    { id: string; name: string; description: string; imageUrl: string }[]
  >([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "trending", "items"),
      (snap) => {
        setDestinations(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
      }
    );
    return () => unsub();
  }, []);

  if (destinations.length === 0)
    return (
      <div className="text-center py-16 text-gray-500 italic">
        🌄 No trending destinations available
      </div>
    );

  return (
    <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 container mx-auto px-4">
      {destinations.map((dest, i) => (
        <motion.div
          key={dest.id}
          className="relative overflow-hidden rounded-2xl shadow-md group bg-white/50"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          <div
            className="h-64 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
            style={{
              backgroundImage: `url(${dest.imageUrl || "/placeholder-destination.jpg"})`,
            }}
          ></div>
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition"></div>
          <div className="absolute bottom-0 p-6 text-white z-10">
            <h3 className="text-2xl font-bold drop-shadow-lg">{dest.name}</h3>
            <p className="text-sm mt-2 drop-shadow">{dest.description}</p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

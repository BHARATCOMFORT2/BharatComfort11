"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function FeaturedListings() {
  const [listings, setListings] = useState<
    { id: string; title: string; location: string; price: number; imageUrl: string }[]
  >([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "featured", "items"),
      (snap) => {
        setListings(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
      }
    );
    return () => unsub();
  }, []);

  if (listings.length === 0)
    return (
      <div className="text-center py-16 text-gray-500 italic">
        🏕 No featured listings available
      </div>
    );

  return (
    <section className="container mx-auto px-4 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {listings.map((item, i) => (
        <motion.div
          key={item.id}
          className="rounded-2xl overflow-hidden shadow-md bg-white/50"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          <div
            className="h-60 bg-cover bg-center"
            style={{
              backgroundImage: `url(${item.imageUrl || "/placeholder.jpg"})`,
            }}
          ></div>
          <div className="p-4">
            <h3 className="text-lg font-bold">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.location}</p>
            <p className="font-semibold mt-1">₹{item.price}/night</p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

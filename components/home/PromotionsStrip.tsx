"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function PromotionsStrip() {
  const [promotions, setPromotions] = useState<
    { id: string; title: string; description: string; imageUrl: string }[]
  >([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "promotions", "items"),
      (snap) => {
        setPromotions(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          }))
        );
      }
    );
    return () => unsub();
  }, []);

  if (promotions.length === 0)
    return (
      <div className="text-center py-20 text-gray-500 italic">
        ✨ No promotions active right now
      </div>
    );

  return (
    <section className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {promotions.map((promo, i) => (
        <motion.div
          key={promo.id}
          className="relative overflow-hidden rounded-2xl shadow-lg group"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          {/* Background image */}
          <div
            className="h-64 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{
              backgroundImage: `url(${promo.imageUrl || "/placeholder-promo.jpg"})`,
            }}
          ></div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition" />

          {/* Text content */}
          <div className="absolute bottom-0 p-6 text-white z-10">
            <h3 className="text-2xl font-bold drop-shadow-md">{promo.title}</h3>
            <p className="text-sm mt-2 drop-shadow-md">{promo.description}</p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

/* ------------------------------------------
   ✅ SAMPLE FALLBACK PROMOTIONS
------------------------------------------- */
const SAMPLE_PROMOTIONS = [
  {
    id: "P1",
    title: "Flat 30% Off on Goa Resorts",
    description: "Limited time offer on beachside resorts & stays.",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  },
  {
    id: "P2",
    title: "Manali Winter Special",
    description: "Snow stays & adventure packages starting ₹1999.",
    imageUrl:
      "https://images.unsplash.com/photo-1544717305-2782549b5136",
  },
  {
    id: "P3",
    title: "Jaipur Heritage Hotels Deal",
    description: "Live like royalty with luxury heritage stays.",
    imageUrl:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41",
  },
  {
    id: "P4",
    title: "Rishikesh Yoga Retreat",
    description: "Wellness, yoga & riverside stays at best prices.",
    imageUrl:
      "https://images.unsplash.com/photo-1602339752474-36f0c7b63058",
  },
  {
    id: "P5",
    title: "Shimla Summer Escape",
    description: "Cool hill station cafes & scenic stays.",
    imageUrl:
      "https://images.unsplash.com/photo-1623074077480-4faff1c5e81a",
  },
  {
    id: "P6",
    title: "Udaipur Romantic Packages",
    description: "Lakeside dinners & romantic palace hotels.",
    imageUrl:
      "https://images.unsplash.com/photo-1588416936097-41850ab3d86d",
  },
];

export default function PromotionsStrip() {
  const [promotions, setPromotions] = useState<
    { id: string; title: string; description: string; imageUrl: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------
     🔥 Firestore Real-Time Fetch (WITH FALLBACK)
  ------------------------------------------- */
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "homepage", "promotions", "items"),
        (snap) => {
          if (!snap.empty) {
            setPromotions(
              snap.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
              }))
            );
          } else {
            // ✅ Firestore empty → SAMPLE fallback
            setPromotions(SAMPLE_PROMOTIONS);
          }
          setLoading(false);
        },
        (err) => {
          console.error("❌ Promotions Firestore error:", err);
          // ✅ Error → SAMPLE fallback
          setPromotions(SAMPLE_PROMOTIONS);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("❌ Promotions Init failed:", err);
      setPromotions(SAMPLE_PROMOTIONS);
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------
     🧠 Loading State
  ------------------------------------------- */
  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 italic animate-pulse">
        ✨ Loading promotions...
      </div>
    );
  }

  /* ------------------------------------------
     🎨 Render (REAL or SAMPLE)
  ------------------------------------------- */
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
              backgroundImage: `url(${
                promo.imageUrl || "/placeholder-promo.jpg"
              })`,
            }}
          ></div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition" />

          {/* Text content */}
          <div className="absolute bottom-0 p-6 text-white z-10">
            <h3 className="text-2xl font-bold drop-shadow-md">
              {promo.title}
            </h3>
            <p className="text-sm mt-2 drop-shadow-md">
              {promo.description}
            </p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

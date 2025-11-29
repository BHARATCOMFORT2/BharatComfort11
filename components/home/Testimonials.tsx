"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

/* ------------------------------------------
   ✅ SAMPLE FALLBACK TESTIMONIALS
------------------------------------------- */
const SAMPLE_TESTIMONIALS = [
  {
    id: "T1",
    name: "Amit Sharma",
    message: "Booking experience was super smooth. Hotels were exactly as shown!",
    imageUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    rating: 5,
  },
  {
    id: "T2",
    name: "Neha Verma",
    message: "Loved the UI and quick support. Manali trip was awesome!",
    imageUrl: "https://randomuser.me/api/portraits/women/45.jpg",
    rating: 4,
  },
  {
    id: "T3",
    name: "Rahul Singh",
    message: "Payment was fast and hassle-free. Highly recommended.",
    imageUrl: "https://randomuser.me/api/portraits/men/76.jpg",
    rating: 5,
  },
  {
    id: "T4",
    name: "Pooja Mishra",
    message: "Great resorts and real photos. No fake listings found.",
    imageUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    rating: 4,
  },
  {
    id: "T5",
    name: "Sandeep Yadav",
    message: "Used Pay at Hotel option — very convenient!",
    imageUrl: "https://randomuser.me/api/portraits/men/41.jpg",
    rating: 5,
  },
  {
    id: "T6",
    name: "Kritika Patel",
    message: "Customer service is very responsive. Will book again.",
    imageUrl: "https://randomuser.me/api/portraits/women/52.jpg",
    rating: 4,
  },
];

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<
    { id: string; name: string; message: string; imageUrl: string; rating?: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------
     🔥 Firestore Real-Time Fetch (WITH FALLBACK)
  ------------------------------------------- */
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, "homepage", "testimonials", "items"),
        (snap) => {
          if (!snap.empty) {
            setTestimonials(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
            );
          } else {
            // ✅ Firestore empty → SAMPLE fallback
            setTestimonials(SAMPLE_TESTIMONIALS);
          }
          setLoading(false);
        },
        (err) => {
          console.error("❌ Testimonials Firestore error:", err);
          // ✅ Firestore error → SAMPLE fallback
          setTestimonials(SAMPLE_TESTIMONIALS);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("❌ Testimonials Init failed:", err);
      setTestimonials(SAMPLE_TESTIMONIALS);
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------
     🧠 Loading State
  ------------------------------------------- */
  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500 italic animate-pulse">
        ⭐ Loading customer reviews...
      </div>
    );
  }

  /* ------------------------------------------
     🎨 Render (REAL or SAMPLE)
  ------------------------------------------- */
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 container mx-auto px-4">
      {testimonials.map((t, i) => (
        <motion.div
          key={t.id}
          className="p-6 bg-white rounded-2xl shadow-md text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          {t.imageUrl && (
            <img
              src={t.imageUrl}
              alt={t.name}
              className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
            />
          )}

          <h3 className="font-semibold text-yellow-800">{t.name}</h3>

          <p className="mt-2 text-gray-600">{t.message}</p>

          {t.rating && (
            <p className="mt-1 text-yellow-700">
              {"★".repeat(t.rating)}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

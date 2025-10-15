"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<
    { id: string; name: string; message: string; imageUrl: string; rating?: number }[]
  >([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "testimonials", "items"),
      (snap) => {
        setTestimonials(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }
    );
    return () => unsub();
  }, []);

  if (!testimonials.length)
    return (
      <div className="text-center py-16 text-gray-500 italic">
        ⭐ No testimonials yet
      </div>
    );

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
            <p className="mt-1 text-yellow-700">{"★".repeat(t.rating)}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

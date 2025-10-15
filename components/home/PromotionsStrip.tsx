"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { motion } from "framer-motion";

export default function PromotionsStrip() {
  const [promotions, setPromotions] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "homepage", "promotions", "items"),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPromotions(items);
    });
    return () => unsub();
  }, []);

  if (!promotions.length)
    return (
      <div className="text-center py-10 text-gray-500">
        No active promotions right now.
      </div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {promotions.map((promo, index) => (
        <motion.div
          key={promo.id}
          className="bg-white/80 p-4 rounded-2xl shadow-lg backdrop-blur-md hover:shadow-xl transition-shadow"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          viewport={{ once: true }}
        >
          <img
            src={promo.imageUrl}
            alt={promo.title}
            className="w-full h-48 object-cover rounded-xl mb-4"
          />
          <h3 className="text-xl font-semibold text-yellow-800 mb-2">
            {promo.title}
          </h3>
          <p className="text-gray-700 text-sm mb-3">{promo.description}</p>
          {promo.link && (
            <a
              href={promo.link}
              className="text-yellow-700 hover:underline font-medium"
            >
              Learn More →
            </a>
          )}
        </motion.div>
      ))}
    </div>
  );
}

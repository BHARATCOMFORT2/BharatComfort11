"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";

interface Listing {
  id: string;
  name: string;
  location: string;
  category?: string;
  price: number;
  imageUrl?: string;
  status?: string;
}

export default function FeaturedListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(6)
    );

    const unsub = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Listing, "id">),
        }));
        setListings(data);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Firestore listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-500 animate-pulse">
        Loading featured listings...
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 italic">
        🏕 No featured listings available yet
      </div>
    );
  }

  return (
    <section className="container mx-auto px-4 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {listings.map((item, i) => (
        <motion.div
          key={item.id}
          onClick={() => (window.location.href = `/listing/${item.id}`)}
          className="rounded-2xl overflow-hidden shadow-md bg-white/50 hover:shadow-xl transition cursor-pointer"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          <div
            className="h-60 bg-cover bg-center"
            style={{
              backgroundImage: `url(${
                item.imageUrl ||
                "https://via.placeholder.com/600x400?text=No+Image"
              })`,
            }}
          ></div>

          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-800">
              {item.name || "Untitled Listing"}
            </h3>
            <p className="text-sm text-gray-600">{item.location}</p>
            {item.category && (
              <p className="text-xs text-gray-500 capitalize">
                {item.category}
              </p>
            )}
            <p className="font-semibold mt-1 text-yellow-700">
              ₹{item.price?.toLocaleString()}/night
            </p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

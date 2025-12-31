"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  limit,
} from "firebase/firestore";
import { motion } from "framer-motion";
import Link from "next/link";

/* -------------------------
   TYPES
-------------------------- */
interface Trending {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

interface Listing {
  id: string;
  name: string;
  location: string;
  price: number;
  images: string[];
}

/* -------------------------
   FALLBACKS
-------------------------- */
const SAMPLE_TRENDING: Trending[] = [
  {
    id: "1",
    name: "Goa",
    description: "Beach resorts & nightlife",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  },
  {
    id: "2",
    name: "Manali",
    description: "Snow stays & adventure",
    imageUrl:
      "https://images.unsplash.com/photo-1544717305-2782549b5136",
  },
];

export default function ExplorePage() {
  const [trending, setTrending] = useState<Trending[]>([]);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  /* -------------------------
     🔥 FETCH DATA
  -------------------------- */
  useEffect(() => {
    // TRENDING
    const unsubTrending = onSnapshot(
      collection(db, "homepage", "trending", "items"),
      (snap) => {
        if (!snap.empty) {
          setTrending(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
          );
        } else {
          setTrending(SAMPLE_TRENDING);
        }
      },
      () => setTrending(SAMPLE_TRENDING)
    );

    // FEATURED LISTINGS
    const unsubFeatured = onSnapshot(
      query(
        collection(db, "listings"),
        where("featured", "==", true),
        limit(6)
      ),
      (snap) => {
        setFeatured(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name,
              location: data.location,
              price: data.price,
              images: data.images || [data.image],
            };
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      unsubTrending();
      unsubFeatured();
    };
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading Explore...
      </div>
    );

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* ---------------- TRENDING ---------------- */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">
          🔥 Trending Destinations
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {trending.map((t, i) => (
            <motion.div
              key={t.id}
              whileHover={{ scale: 1.04 }}
              className="relative h-60 rounded-xl overflow-hidden shadow-md"
            >
              <img
                src={t.imageUrl}
                className="w-full h-full object-cover"
                alt={t.name}
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute bottom-0 p-4 text-white">
                <h3 className="text-xl font-bold">{t.name}</h3>
                <p className="text-sm">{t.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- FEATURED ---------------- */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            🌟 Featured Stays
          </h2>
          <Link
            href="/listings"
            className="text-indigo-600 text-sm"
          >
            View all →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {featured.map((l) => (
            <motion.div
              key={l.id}
              whileHover={{ scale: 1.03 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <img
                src={l.images?.[0] || "/placeholder.jpg"}
                className="h-48 w-full object-cover"
                alt={l.name}
              />
              <div className="p-4">
                <h3 className="font-semibold">{l.name}</h3>
                <p className="text-sm text-gray-500">
                  {l.location}
                </p>
                <p className="font-bold text-indigo-600 mt-1">
                  ₹{l.price}/night
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

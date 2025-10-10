"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, limit } from "firebase/firestore";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ExplorePage() {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔹 Fetch top destinations
    const unsubDest = onSnapshot(
      collection(db, "destinations"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDestinations(data.slice(0, 6)); // show top 6
      }
    );

    // 🔹 Fetch featured stays
    const unsubStays = onSnapshot(collection(db, "stays"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStays(data.slice(0, 6));
      setLoading(false);
    });

    return () => {
      unsubDest();
      unsubStays();
    };
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading explore page...
      </div>
    );

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-center mb-2">Explore Bharat</h1>
      <p className="text-center text-gray-600 mb-8">
        Discover trending places, unique stays, and travel inspirations.
      </p>

      {/* Trending Destinations */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Trending Destinations</h2>
          <Link href="/destinations" className="text-indigo-600 text-sm hover:underline">
            View all →
          </Link>
        </div>

        {destinations.length === 0 ? (
          <p className="text-gray-500">No destinations found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((d) => (
              <motion.div
                key={d.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition"
                whileHover={{ scale: 1.03 }}
              >
                <img
                  src={d.image || "/placeholder.jpg"}
                  alt={d.title}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{d.title}</h3>
                  <p className="text-sm text-gray-500">{d.state}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Featured Stays */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Featured Stays</h2>
          <Link href="/stays" className="text-indigo-600 text-sm hover:underline">
            View all →
          </Link>
        </div>

        {stays.length === 0 ? (
          <p className="text-gray-500">No featured stays yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stays.map((stay) => (
              <motion.div
                key={stay.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition"
                whileHover={{ scale: 1.03 }}
              >
                <img
                  src={stay.image || "/placeholder.jpg"}
                  alt={stay.name}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{stay.name}</h3>
                  <p className="text-sm text-gray-500">{stay.location}</p>
                  <p className="text-indigo-600 font-bold mt-1">
                    ₹{stay.price}/night
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Travel Tips / Coming Soon */}
      <section className="text-center border-t pt-8 mt-8">
        <h2 className="text-2xl font-semibold mb-2">Travel Inspiration ✈️</h2>
        <p className="text-gray-600 mb-4">
          Coming soon: curated travel tips, stories, and guides from verified partners.
        </p>
      </section>
    </motion.div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "destinations"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDestinations(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading destinations...
      </div>
    );

  return (
    <motion.div
      className="min-h-screen bg-white p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold text-center mb-6">Top Destinations</h1>
      {destinations.length === 0 ? (
        <p className="text-center text-gray-500">No destinations found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((d) => (
            <motion.div
              key={d.id}
              whileHover={{ scale: 1.03 }}
              className="bg-gray-50 rounded-2xl shadow hover:shadow-xl overflow-hidden"
            >
              <img
                src={d.image || "/placeholder.jpg"}
                alt={d.title}
                className="h-48 w-full object-cover"
              />
              <div className="p-4">
                <h2 className="font-semibold text-lg">{d.title}</h2>
                <p className="text-sm text-gray-500">{d.state}</p>
                <p className="text-gray-600 mt-2 text-sm">
                  {d.description?.slice(0, 100)}...
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

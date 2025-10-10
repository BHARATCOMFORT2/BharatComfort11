"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function StaysPage() {
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stays"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStays(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading stays...
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold mb-6 text-center">Available Stays</h1>
      {stays.length === 0 ? (
        <p className="text-center text-gray-500">No stays available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stays.map((stay) => (
            <motion.div
              key={stay.id}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.03 }}
            >
              <img
                src={stay.image || "/placeholder.jpg"}
                alt={stay.name}
                className="h-48 w-full object-cover"
              />
              <div className="p-4">
                <h2 className="font-semibold text-lg">{stay.name}</h2>
                <p className="text-sm text-gray-500">{stay.location}</p>
                <p className="text-indigo-600 font-bold mt-2">
                  ₹{stay.price}/night
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

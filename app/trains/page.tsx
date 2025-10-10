"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function TrainsPage() {
  const [trains, setTrains] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "trains"), (snap) => {
      setTrains(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <motion.div
      className="min-h-screen bg-white p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold text-center mb-6">Trains</h1>
      {trains.length === 0 ? (
        <p className="text-center text-gray-500">No trains available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trains.map((t) => (
            <div
              key={t.id}
              className="bg-gray-50 rounded-xl shadow p-4 hover:shadow-lg transition"
            >
              <h2 className="font-semibold text-lg">
                {t.source} → {t.destination}
              </h2>
              <p className="text-sm text-gray-500">{t.trainName}</p>
              <p className="text-indigo-600 mt-2 font-bold">₹{t.price}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

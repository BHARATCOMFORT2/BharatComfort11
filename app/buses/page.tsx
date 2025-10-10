"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";

export default function BusesPage() {
  const [buses, setBuses] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "buses"), (snap) => {
      setBuses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <motion.div
      className="min-h-screen bg-gray-50 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold text-center mb-6">Bus Tickets</h1>
      {buses.length === 0 ? (
        <p className="text-center text-gray-500">No buses available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {buses.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition"
            >
              <h2 className="font-semibold text-lg">
                {b.source} → {b.destination}
              </h2>
              <p className="text-sm text-gray-500">{b.busName}</p>
              <p className="text-indigo-600 mt-2 font-bold">₹{b.price}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { motion } from "framer-motion";

export default function FeaturedListings() {
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(6)
    );

    const unsub = onSnapshot(q, (snap) => {
      setListings(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, []);

  if (listings.length === 0)
    return (
      <div className="text-center py-16 text-gray-500 italic">
        🏕 No featured listings available
      </div>
    );

  return (
    <section className="container mx-auto px-4 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {listings.map((item, i) => (
        <motion.div
          key={item.id}
          onClick={() => (window.location.href = `/listing/${item.id}`)} // ✅ Navigate to details
          className="rounded-2xl overflow-hidden shadow-md bg-white/50 cursor-pointer"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          viewport={{ once: true }}
        >
          <div
            className="h-60 bg-cover bg-center"
            style={{
              backgroundImage: `url(${item.imageUrl || "/placeholder.jpg"})`,
            }}
          ></div>
          <div className="p-4">
            <h3 className="text-lg font-bold">{item.name || item.title}</h3>
            <p className="text-sm text-gray-600">{item.location}</p>
            <p className="font-semibold mt-1">₹{item.price}/night</p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

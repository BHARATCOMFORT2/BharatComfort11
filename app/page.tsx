"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Hero from "@/components/home/Hero";
import QuickActionStrip from "@/components/home/QuickActionStrip";
import PromotionsStrip from "@/components/home/PromotionsStrip";
import RecentStories from "@/components/home/RecentStories";
import Testimonials from "@/components/home/Testimonials";
import NewsletterSignup from "@/components/home/NewsletterSignup";
import Footer from "@/components/home/Footer";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Stay {
  id: string;
  name: string;
  price: number;
  image?: string;
  location?: string;
}

export default function HomePage() {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, -50]);
  const yCards = useTransform(scrollY, [0, 800], [0, 30]);

  const [featured, setFeatured] = useState<Stay[]>([]);
  const [trending, setTrending] = useState<Stay[]>([]);

  // Fetch Featured Listings
  useEffect(() => {
    const q = query(collection(db, "stays"), where("featured", "==", true));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Stay[];
      setFeatured(data);
    });
    return () => unsub();
  }, []);

  // Fetch Trending Destinations
  useEffect(() => {
    const q = query(collection(db, "stays"), where("trending", "==", true));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Stay[];
      setTrending(data);
    });
    return () => unsub();
  }, []);

  return (
    <main className="relative bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd] text-gray-900 min-h-screen font-sans overflow-x-hidden">
      {/* Hero Section */}
      <motion.div style={{ y: yHero }}>
        <Hero />
      </motion.div>

      {/* Quick Actions */}
      <motion.section
        className="py-16 container mx-auto px-4"
        style={{ y: yCards }}
        initial={{ opacity: 0, x: -60 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <QuickActionStrip />
      </motion.section>

      {/* Featured Listings */}
      <motion.section
        className="py-16 container mx-auto px-4"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
          Featured Trips
        </h2>
        {featured.length === 0 ? (
          <p className="text-center text-gray-500">No featured trips.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((stay) => (
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
                  <h3 className="font-semibold text-lg">{stay.name}</h3>
                  <p className="text-sm text-gray-500">{stay.location}</p>
                  <p className="text-indigo-600 font-bold mt-2">₹{stay.price}/night</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Promotions */}
      <motion.section
        className="py-16 container mx-auto px-4 bg-white/20 backdrop-blur-lg rounded-2xl shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <PromotionsStrip />
      </motion.section>

      {/* Trending Destinations */}
      <motion.section
        className="py-16 container mx-auto px-4"
        initial={{ opacity: 0, x: 60 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
          Trending Destinations
        </h2>
        {trending.length === 0 ? (
          <p className="text-center text-gray-500">No trending destinations.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trending.map((stay) => (
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
                  <h3 className="font-semibold text-lg">{stay.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Recent Stories */}
      <motion.section
        className="py-16 container mx-auto px-4"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <RecentStories />
      </motion.section>

      {/* Testimonials */}
      <motion.section
        className="py-16 container mx-auto px-4 bg-white/20 backdrop-blur-lg rounded-2xl shadow-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <Testimonials />
      </motion.section>

      {/* Newsletter */}
      <motion.section
        className="py-16 container mx-auto px-4 text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <NewsletterSignup />
      </motion.section>

      {/* Footer */}
      <Footer />
    </main>
  );
}

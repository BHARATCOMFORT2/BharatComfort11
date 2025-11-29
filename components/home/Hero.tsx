"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

/* ------------------------------------------
   ✅ SAMPLE FALLBACK HERO DATA
------------------------------------------- */
const SAMPLE_HERO = {
  title: "Welcome to BharatComfort",
  subtitle: "Discover Royal Journeys Across India",
  imageUrl:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", // Goa beach style
};

export default function Hero() {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, -50]);

  const [hero, setHero] = useState<{
    title: string;
    subtitle: string;
    imageUrl: string;
  }>(SAMPLE_HERO);

  const [loading, setLoading] = useState(true);

  /* ------------------------------------------
     🔥 Firestore Real-Time Fetch (WITH FALLBACK)
  ------------------------------------------- */
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, "homepage", "hero"),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as {
              title?: string;
              subtitle?: string;
              imageUrl?: string;
            };

            setHero({
              title: data.title || SAMPLE_HERO.title,
              subtitle: data.subtitle || SAMPLE_HERO.subtitle,
              imageUrl: data.imageUrl || SAMPLE_HERO.imageUrl,
            });
          } else {
            // ✅ Firestore doc missing → SAMPLE fallback
            setHero(SAMPLE_HERO);
          }
          setLoading(false);
        },
        (err) => {
          console.error("❌ Hero Firestore error:", err);
          // ✅ Error → SAMPLE fallback
          setHero(SAMPLE_HERO);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("❌ Hero Init failed:", err);
      setHero(SAMPLE_HERO);
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------
     🧠 Optional Loading Overlay
  ------------------------------------------- */
  if (loading) {
    return (
      <section className="relative h-screen flex items-center justify-center bg-black text-white">
        <p className="animate-pulse text-lg">Loading hero...</p>
      </section>
    );
  }

  /* ------------------------------------------
     🎨 Render (REAL or SAMPLE)
  ------------------------------------------- */
  return (
    <section className="relative h-screen overflow-hidden">
      {/* Hero Image with Parallax */}
      <motion.div style={{ y: yHero }}>
        <div
          className="relative h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${hero.imageUrl || "/hero-bg.jpg"})`,
          }}
        >
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
      </motion.div>

      {/* Hero Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
        <motion.h1
          className="text-6xl md:text-7xl font-serif font-bold text-yellow-800 drop-shadow-lg"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          {hero.title}
        </motion.h1>

        <motion.p
          className="mt-6 text-xl md:text-2xl max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {hero.subtitle}
        </motion.p>

        <motion.a
          href="/explore"
          className="mt-8 inline-block px-8 py-4 bg-yellow-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-yellow-500/30 transition"
        >
          Explore Now
        </motion.a>
      </div>
    </section>
  );
}

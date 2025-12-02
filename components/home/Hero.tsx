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
  imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
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
            setHero(SAMPLE_HERO);
          }
          setLoading(false);
        },
        () => {
          setHero(SAMPLE_HERO);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch {
      setHero(SAMPLE_HERO);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <section className="relative min-h-[70vh] flex items-center justify-center bg-black text-white">
        <p className="animate-pulse text-lg">Loading hero...</p>
      </section>
    );
  }

  return (
    {/* ✅ NOT FULL SCREEN ANYMORE */}
    <section className="relative min-h-[85vh] md:min-h-screen overflow-hidden">
      {/* ✅ Hero Image with Parallax */}
      <motion.div style={{ y: yHero }} className="absolute inset-0">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${hero.imageUrl || "/hero-bg.jpg"})`,
          }}
        >
          {/* ✅ Stronger overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80"></div>
        </div>
      </motion.div>

      {/* ✅ Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 md:pt-32">
        <motion.h1
          className="text-4xl md:text-7xl font-serif font-bold text-yellow-400 drop-shadow-xl"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          {hero.title}
        </motion.h1>

        <motion.p
          className="mt-5 text-base md:text-2xl max-w-2xl text-white/90"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {hero.subtitle}
        </motion.p>

        <motion.a
          href="/explore"
          className="mt-7 inline-block px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-full shadow-xl hover:shadow-yellow-500/30 transition"
        >
          Explore Now
        </motion.a>
      </div>

      {/* ✅ SCROLL HINT INDICATOR (VERY IMPORTANT FOR UX) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center text-white/80">
        <span className="text-xs mb-1 tracking-widest">SCROLL</span>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="text-2xl"
        >
          ↓
        </motion.div>
      </div>

      {/* ✅ FADE INTO NEXT SECTION (VISUAL HINT THAT MORE CONTENT EXISTS) */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0b1220] to-transparent z-10" />
    </section>
  );
}

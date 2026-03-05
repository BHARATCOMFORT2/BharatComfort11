"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

/* ------------------------------------------
   FALLBACK HERO
------------------------------------------- */

const SAMPLE_HERO = {
  title: "Welcome to BharatComfort",
  subtitle: "Discover Royal Journeys Across India",
  imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
};

export default function Hero() {

  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, -50]);

  const [hero, setHero] = useState(SAMPLE_HERO);

  useEffect(() => {

    const unsub = onSnapshot(
      doc(db, "homepage", "hero"),
      (snap) => {

        if (snap.exists()) {

          const data = snap.data();

          setHero({
            title: data.title || SAMPLE_HERO.title,
            subtitle: data.subtitle || SAMPLE_HERO.subtitle,
            imageUrl: data.imageUrl || SAMPLE_HERO.imageUrl,
          });

        }

      },
      () => {
        setHero(SAMPLE_HERO);
      }
    );

    return () => unsub();

  }, []);

  return (
    <section className="relative min-h-[85vh] md:min-h-screen overflow-hidden">

      {/* HERO IMAGE */}
      <motion.div style={{ y: yHero }} className="absolute inset-0">

        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${hero.imageUrl})`,
          }}
        >

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80"></div>

        </div>

      </motion.div>

      {/* HERO CONTENT */}

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

    </section>
  );
}

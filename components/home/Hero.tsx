"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function Hero() {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, -50]);

  const [hero, setHero] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "homepage", "hero"), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as {
          title: string;
          subtitle: string;
          imageUrl: string;
        };
        setHero(data);
      }
    });
    return () => unsub();
  }, []);

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
          {hero.title || "Welcome to BharatComfort"}
        </motion.h1>

        <motion.p
          className="mt-6 text-xl md:text-2xl max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {hero.subtitle || "Discover Royal Journeys Across India"}
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

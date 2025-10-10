"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export default function Hero() {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, -50]);

  return (
    <section className="relative h-screen overflow-hidden">

      {/* Hero Image with Parallax */}
      <motion.div style={{ y: yHero }}>
        <div className="relative h-full bg-[url('/hero-bg.jpg')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
      </motion.div>

      {/* Soft gradient shimmer overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "linear-gradient(120deg, rgba(255,255,255,0.15), rgba(255,245,220,0.1), rgba(255,255,255,0.15))",
          backgroundSize: "400% 400%",
        }}
      />

      {/* Floating subtle sparkles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/60 opacity-40 blur-sm"
          animate={{
            x: [0, Math.random() * 150 - 75, 0],
            y: [0, Math.random() * 300 - 150, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 8 + Math.random() * 5,
            repeat: Infinity,
            repeatType: "mirror",
            delay: Math.random() * 3,
          }}
        />
      ))}

      {/* Hero Content with Soft Gold Rays */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">

        {/* Soft gold-white rays behind text */}
        <motion.div
          className="absolute w-full h-64 top-1/3"
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-32 bg-white/30 opacity-40 blur-sm left-1/2 transform -translate-x-1/2"
              style={{
                rotate: `${i * 30}deg`,
                background: `linear-gradient(to bottom, rgba(255,245,200,0.5), rgba(255,245,200,0))`,
              }}
            />
          ))}
        </motion.div>

        <motion.h1
          className="relative text-6xl md:text-7xl font-serif font-bold text-yellow-800 drop-shadow-lg z-20"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Welcome to BharatComfort
        </motion.h1>

        <motion.p
          className="mt-6 text-xl md:text-2xl max-w-2xl relative z-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          Discover Royal Journeys Across India
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <motion.a
            href="/explore"
            className="mt-8 relative inline-block px-8 py-4 bg-yellow-700 text-white font-semibold rounded-2xl shadow-lg overflow-hidden group"
          >
            <span className="relative z-20">Explore Now</span>
            {/* Shimmer Effect */}
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 transform -translate-x-full group-hover:opacity-80"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
            {/* Hover Glow */}
            <span className="absolute inset-0 rounded-2xl shadow-lg shadow-yellow-500/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

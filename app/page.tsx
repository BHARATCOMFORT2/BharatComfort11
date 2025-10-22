"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import "@/lib/payments/register";

import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// 🧱 Lazy imports for heavy components (boosts performance)
const Hero = dynamic(() => import("@/components/home/Hero"));
const QuickActionStrip = dynamic(() => import("@/components/home/QuickActionStrip"));
const FeaturedListings = dynamic(() => import("@/components/home/FeaturedListings"));
const PromotionsStrip = dynamic(() => import("@/components/home/PromotionsStrip"));
const RecentStories = dynamic(() => import("@/components/home/RecentStories"));
const TrendingDestinations = dynamic(() => import("@/components/home/TrendingDestinations"));
const Testimonials = dynamic(() => import("@/components/home/Testimonials"));
const NewsletterSignup = dynamic(() => import("@/components/home/NewsletterSignup"));
const Footer = dynamic(() => import("@/components/home/Footer"));
const AIRecommendations = dynamic(() => import("@/components/home/AIRecommendations"));

export default function HomePage() {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, -50]);
  const yCards = useTransform(scrollY, [0, 800], [0, 30]);

  const [profile, setProfile] = useState<any>(null);

  // ✅ Safe listener: Only fetch Firestore data when user is authenticated
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setProfile(null);
        return;
      }

      const ref = doc(db, "users", user.uid);
      const unsubscribeProfile = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) setProfile(snap.data());
          else setProfile({ name: "Traveler", role: "user" });
        },
        (err) => {
          console.warn("⚠️ Firestore listener error:", err.message);
        }
      );

      return () => unsubscribeProfile();
    });

    return () => unsubscribeAuth();
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
        <FeaturedListings />
      </motion.section>

      {/* AI Recommendations (visible only when logged in) */}
      {profile && (
        <motion.section
          className="py-16 container mx-auto px-4"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
            Recommended For You
          </h2>
          <AIRecommendations profile={profile} />
        </motion.section>
      )}

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
        <TrendingDestinations />
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

      {/* Newsletter Signup */}
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

"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import "@/lib/payments/register";

import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import HiringForm from "@/components/sections/HiringForm";

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

/* ✅✅✅ SAMPLE DATA (TEMP — REAL DATA FUTURE READY) ✅✅✅ */

// HERO
const SAMPLE_HERO = [
  {
    title: "Explore Top Budget Hotels in India",
    subtitle: "Starting at ₹999/night",
    image: "https://images.unsplash.com/photo-1501117716987-c8e1ecb210a8",
  },
  {
    title: "Luxury Resorts, Cafes & Cottages",
    subtitle: "Goa, Manali, Jaipur & More",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
  },
];

// FEATURED
const SAMPLE_FEATURED = [
  {
    id: "SF1",
    name: "Sea View Resort",
    location: "Goa",
    price: 3499,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
  },
  {
    id: "SF2",
    name: "Snow Valley Hotel",
    location: "Manali",
    price: 2799,
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1505692952047-1a78307da8f2",
  },
  {
    id: "SF3",
    name: "Royal Palace Stay",
    location: "Jaipur",
    price: 3999,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
  },
];

// PROMOTIONS
const SAMPLE_PROMOTIONS = [
  { id: "P1", title: "FLAT 30% OFF", subtitle: "First Booking Only" },
  { id: "P2", title: "PAY AT HOTEL", subtitle: "No Advance Payment" },
];

// TRENDING
const SAMPLE_TRENDING = [
  { city: "Goa", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", listings: 42 },
  { city: "Manali", image: "https://images.unsplash.com/photo-1544717305-2782549b5136", listings: 31 },
  { city: "Jaipur", image: "https://images.unsplash.com/photo-1599661046289-e31897846e41", listings: 28 },
  { city: "Udaipur", image: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d", listings: 19 },
];

// STORIES
const SAMPLE_STORIES = [
  {
    id: "S1",
    title: "Top 10 Budget Hotels in Goa",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    category: "Hotels",
  },
  {
    id: "S2",
    title: "Best Cafes in Manali With Views",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9",
    category: "Cafes",
  },
  {
    id: "S3",
    title: "Udaipur Honeymoon Travel Guide",
    image: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d",
    category: "Travel",
  },
];

export default function HomePage() {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, -50]);
  const yCards = useTransform(scrollY, [0, 800], [0, 30]);

  const [profile, setProfile] = useState<any>(null);

  // ✅ Safe listener
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
      {/* ✅ HERO (SAMPLE + FUTURE REAL READY) */}
      <motion.div style={{ y: yHero }}>
        <Hero banners={SAMPLE_HERO} />
      </motion.div>

      {/* Quick Actions (Real Component As-is) */}
      <motion.section className="py-16 container mx-auto px-4" style={{ y: yCards }}>
        <QuickActionStrip />
      </motion.section>

      {/* ✅ FEATURED LISTINGS (SAMPLE) */}
      <motion.section className="py-16 container mx-auto px-4">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
          Featured Trips
        </h2>
        <FeaturedListings listings={SAMPLE_FEATURED} />
      </motion.section>

      {/* ✅ AI Recommendations (REAL USER) */}
      {profile && (
        <motion.section className="py-16 container mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
            Recommended For You
          </h2>
          <AIRecommendations profile={profile} />
        </motion.section>
      )}

      {/* ✅ PROMOTIONS (SAMPLE) */}
      <motion.section className="py-16 container mx-auto px-4 bg-white/20 backdrop-blur-lg rounded-2xl shadow-lg">
        <PromotionsStrip data={SAMPLE_PROMOTIONS} />
      </motion.section>

      {/* ✅ TRENDING (SAMPLE) */}
      <motion.section className="py-16 container mx-auto px-4">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
          Trending Destinations
        </h2>
        <TrendingDestinations destinations={SAMPLE_TRENDING} />
      </motion.section>

      {/* ✅ RECENT STORIES (SAMPLE) */}
      <motion.section className="py-16 container mx-auto px-4">
        <RecentStories stories={SAMPLE_STORIES} />
      </motion.section>

      {/* Testimonials */}
      <motion.section className="py-16 container mx-auto px-4 bg-white/20 backdrop-blur-lg rounded-2xl shadow-lg">
        <Testimonials />
      </motion.section>

      {/* Newsletter */}
      <motion.section className="py-16 container mx-auto px-4 text-center">
        <NewsletterSignup />
      </motion.section>

      {/* Hiring */}
      <motion.section className="py-20 container mx-auto px-4 bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
          Join Our Team
        </h2>
        <HiringForm />
      </motion.section>

      {/* Footer */}
      <Footer />
    </main>
  );
}

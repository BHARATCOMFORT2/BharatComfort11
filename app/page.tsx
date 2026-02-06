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
const PeopleSection = dynamic(
  () => import("@/components/home/PeopleSection"),
  { ssr: false }
);
const CertificationsSection = dynamic(
  () => import("@/components/home/CertificationsSection"),
  { ssr: false }
);
const FounderSection = dynamic(
  () => import("@/components/home/FounderSection"),
  { ssr: false }
);
/* ✅✅✅ SAMPLE DATA (UNCHANGED) ✅✅✅ */

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

const SAMPLE_FEATURED = [
  { id: "SF1", name: "Sea View Resort", location: "Goa", price: 3499, rating: 4.6, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945" },
  { id: "SF2", name: "Snow Valley Hotel", location: "Manali", price: 2799, rating: 4.4, image: "https://images.unsplash.com/photo-1505692952047-1a78307da8f2" },
  { id: "SF3", name: "Royal Palace Stay", location: "Jaipur", price: 3999, rating: 4.7, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b" },
];

const SAMPLE_PROMOTIONS = [
  { id: "P1", title: "FLAT 30% OFF", subtitle: "First Booking Only" },
  { id: "P2", title: "PAY AT HOTEL", subtitle: "No Advance Payment" },
];

const SAMPLE_TRENDING = [
  { city: "Goa", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", listings: 42 },
  { city: "Manali", image: "https://images.unsplash.com/photo-1544717305-2782549b5136", listings: 31 },
  { city: "Jaipur", image: "https://images.unsplash.com/photo-1599661046289-e31897846e41", listings: 28 },
  { city: "Udaipur", image: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d", listings: 19 },
];

const SAMPLE_STORIES = [
  { id: "S1", title: "Top 10 Budget Hotels in Goa", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", category: "Hotels" },
  { id: "S2", title: "Best Cafes in Manali With Views", image: "https://images.unsplash.com/photo-1552566626-52f8b828add9", category: "Cafes" },
  { id: "S3", title: "Udaipur Honeymoon Travel Guide", image: "https://images.unsplash.com/photo-1588416936097-41850ab3d86d", category: "Travel" },
];

export default function HomePage() {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, -50]);
  const yCards = useTransform(scrollY, [0, 800], [0, 30]);

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setProfile(null);
        return;
      }

      const ref = doc(db, "users", user.uid);
      const unsubscribeProfile = onSnapshot(ref, (snap) => {
        if (snap.exists()) setProfile(snap.data());
        else setProfile({ name: "Traveler", role: "user" });
      });

      return () => unsubscribeProfile();
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#020617] text-slate-100 overflow-x-hidden">

      {/* ✅ HERO */}
      <motion.div style={{ y: yHero }}>
        <Hero banners={SAMPLE_HERO} />
      </motion.div>

      {/* ✅ QUICK ACTIONS */}
      <motion.section className="py-20 container mx-auto px-4 relative" style={{ y: yCards }}>
        <div className="rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
          <QuickActionStrip />
        </div>
      </motion.section>

      {/* ✅ FEATURED */}
      <motion.section className="py-20 container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-10 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
          Featured Trips
        </h2>
        <div className="rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
          <FeaturedListings listings={SAMPLE_FEATURED} />
        </div>
      </motion.section>

      {/* ✅ AI Recommendations */}
      {profile && (
        <motion.section className="py-20 container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-10 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            Recommended For You
          </h2>
          <div className="rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
            <AIRecommendations profile={profile} />
          </div>
        </motion.section>
      )}

      {/* ✅ PROMOTIONS */}
      <motion.section className="py-20 container mx-auto px-4">
        <div className="rounded-[2rem] bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/20 backdrop-blur-xl border border-yellow-400/20 shadow-[0_0_40px_rgba(251,191,36,0.15)] p-6">
          <PromotionsStrip data={SAMPLE_PROMOTIONS} />
        </div>
      </motion.section>

      {/* ✅ TRENDING */}
      <motion.section className="py-20 container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-10 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
          Trending Destinations
        </h2>
        <div className="rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
          <TrendingDestinations destinations={SAMPLE_TRENDING} />
        </div>
      </motion.section>

      {/* ✅ STORIES */}
      <motion.section className="py-20 container mx-auto px-4">
        <div className="rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
          <RecentStories stories={SAMPLE_STORIES} />
        </div>
      </motion.section>

      {/* ✅ TESTIMONIALS */}
      <motion.section className="py-20 container mx-auto px-4">
        <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
          <Testimonials />
        </div>
      </motion.section>
      {/* ✅ FOUNDER SECTION */}
<motion.section className="py-20 container mx-auto px-4">
  <div className="rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
    <FounderSection />
  </div>
</motion.section>
{/* ✅ INVESTORS & CONTRIBUTORS */}
<motion.section className="py-20 container mx-auto px-4">
  <div className="rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
    <PeopleSection />
  </div>
</motion.section>
{/* ✅ COMPLIANCE & CERTIFICATIONS */}
<motion.section className="py-20 container mx-auto px-4">
  <div className="rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
    <CertificationsSection />
  </div>
</motion.section>

      {/* ✅ NEWSLETTER */}
      <motion.section className="py-20 container mx-auto px-4 text-center">
        <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6">
          <NewsletterSignup />
        </div>
      </motion.section>

      {/* ✅ HIRING */}
      <motion.section className="py-24 container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-10 bg-gradient-to-r from-emerald-300 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
          Join Our Team
        </h2>
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 backdrop-blur-xl border border-emerald-400/20 shadow-2xl rounded-3xl p-6">
          <HiringForm />
        </div>
      </motion.section>

      {/* ✅ FOOTER */}
      <div className="bg-black border-t border-white/10">
        <Footer />
      </div>
    </main>
  );
}

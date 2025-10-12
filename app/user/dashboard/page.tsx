"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuth,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Firestore,
  getFirestore,
} from "firebase/firestore";
import { app } from "@/lib/firebase"; // modular firebase init

// Components
import Hero from "@/components/home/Hero";
import QuickActionStrip from "@/components/home/QuickActionStrip";
import FeaturedListings from "@/components/home/FeaturedListings";
import PromotionsStrip from "@/components/home/PromotionsStrip";
import TrendingDestinations from "@/components/home/TrendingDestinations";
import RecentStories from "@/components/home/RecentStories";
import Testimonials from "@/components/home/Testimonials";
import NewsletterSignup from "@/components/home/NewsletterSignup";
import Footer from "@/components/home/Footer";
import AIRecommendations from "@/components/home/AIRecommendations";

// ---------------- Types ----------------
interface UserProfile {
  name?: string;
  email?: string;
  role?: string;
  profilePic?: string;
}

interface Stats {
  bookings: number;
  upcoming: number;
  spent: number;
}

// ---------------- Component ----------------
export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ bookings: 0, upcoming: 0, spent: 0 });

  const auth = getAuth(app);
  const db = getFirestore(app);

  // ---------------- Auth & Profile ----------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return router.push("/auth/login");
      setUser(currentUser);

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          setProfile({ name: "User", role: "user" });
        } else {
          const data = docSnap.data() as UserProfile;
          if (data?.role !== "user") {
            alert("Not authorized");
            router.push("/");
            return;
          }
          setProfile(data);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setProfile({ name: "User", role: "user" });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [auth, db, router]);

  // ---------------- Real-time Bookings ----------------
  useEffect(() => {
    if (!user) return;

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(bookingsQuery, (snap) => {
      const allBookings = snap.docs.map((d) => d.data() as any);
      const totalSpent = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const upcoming = allBookings.filter((b) => b.date && new Date(b.date) > new Date()).length;

      setStats({ bookings: allBookings.length, upcoming, spent: totalSpent });
    });

    return () => unsub();
  }, [user, db]);

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;
  if (!profile) return <p className="text-center py-12 text-red-500">Profile not found!</p>;

  return (
    <main className="bg-gradient-to-br from-[#fff8f0] via-[#fff5e8] to-[#fff1dd] text-gray-900 min-h-screen font-sans overflow-x-hidden">

      {/* Hero Section */}
      <Hero />

      {/* Quick Actions */}
      <section className="py-16 container mx-auto px-4">
        <QuickActionStrip />
      </section>

      {/* Featured Listings */}
      <section className="py-16 container mx-auto px-4">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
          Featured Trips
        </h2>
        <FeaturedListings />
      </section>

      {/* Promotions */}
      <section className="py-16 container mx-auto px-4 bg-white/20 backdrop-blur-lg rounded-2xl shadow-lg">
        <PromotionsStrip />
      </section>

      {/* Trending Destinations */}
      <section className="py-16 container mx-auto px-4">
        <h2 className="text-4xl font-serif font-bold text-yellow-800 mb-8 text-center">
          Trending Destinations
        </h2>
        <TrendingDestinations />
      </section>

      {/* Recent Stories */}
      <section className="py-16 container mx-auto px-4">
        <RecentStories />
      </section>

      {/* Testimonials */}
      <section className="py-16 container mx-auto px-4 bg-white/20 backdrop-blur-lg rounded-2xl shadow-lg">
        <Testimonials />
      </section>

      {/* Newsletter */}
      <section className="py-16 container mx-auto px-4 text-center">
        <NewsletterSignup />
      </section>

      {/* AI Recommendations + Razorpay */}
      <section className="py-12 container mx-auto px-4">
        <h2 className="text-3xl font-semibold mb-6 text-center">AI Travel Recommendations</h2>
        <AIRecommendations profile={profile} />
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}

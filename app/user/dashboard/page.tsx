"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

import TrendingDestinations from "@/components/home/TrendingDestinations";
import PromotionsStrip from "@/components/home/PromotionsStrip";
import QuickActionStrip from "@/components/home/QuickActionStrip";
import NewsletterSignup from "@/components/home/NewsletterSignup";
import RecentStories from "@/components/home/RecentStories";
import AIRecommendations from "@/components/home/AIRecommendations";
import MapSection from "@/components/home/MapSection";

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ------------------ Auth & Profile ------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return router.push("/auth/login");
      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const unsubProfile = onSnapshot(userRef, (snap) => {
        if (snap.exists()) setProfile(snap.data());
        else setProfile({ name: "User", role: "user" });
        setLoading(false);
      });

      return () => unsubProfile();
    });
    return () => unsub();
  }, [router]);

  // ------------------ Real-time Bookings ------------------
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      orderBy("date", "desc") // Make sure all bookings have 'date'
    );

    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user]);

  if (loading) return <p className="text-center py-10">Loading your dashboard...</p>;

  return (
    <DashboardLayout
      title="Welcome Back!"
      profile={{
        name: profile?.name,
        role: "user",
        profilePic: profile?.profilePic || "",
      }}
    >
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Hello, {profile?.name || "Traveler"} 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Explore destinations, book stays, and get AI-powered suggestions!
        </p>
      </div>

      <QuickActionStrip />

      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-3">My Recent Trips</h2>
        {bookings.length > 0 ? (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {bookings.map((b) => (
              <li key={b.id} className="flex justify-between border-b py-2">
                <span>{b.listingName || "Trip"}</span>
                <span className="text-gray-500 text-sm">
                  {b.date ? new Date(b.date).toLocaleString() : "Date unknown"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No bookings yet.</p>
        )}
      </div>

      {/* Homepage + AI + Map sections */}
      {profile && <AIRecommendations profile={profile} />}
      <TrendingDestinations />
      <PromotionsStrip />
      <RecentStories />
      <MapSection />
      <NewsletterSignup />
    </DashboardLayout>
  );
}

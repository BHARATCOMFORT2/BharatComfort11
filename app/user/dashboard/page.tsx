"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import QuickActionStrip from "@/components/home/QuickActionStrip";
import TrendingDestinations from "@/components/home/TrendingDestinations";
import PromotionsStrip from "@/components/home/PromotionsStrip";
import RecentStories from "@/components/home/RecentStories";
import NewsletterSignup from "@/components/home/NewsletterSignup";
import AIRecommendations from "@/components/home/AIRecommendations";
import MapSection from "@/components/home/MapSection";

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // -------------------- Auth & Profile --------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }
      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const unsubProfile = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) setProfile(snap.data());
          else setProfile({ name: "User", role: "user" });
          setLoading(false);
        },
        (err) => {
          console.error("Profile fetch error:", err);
          setProfile({ name: "User", role: "user" });
          setLoading(false);
        }
      );

      return () => unsubProfile();
    });

    return () => unsub();
  }, [router]);

  // -------------------- Real-time Bookings --------------------
  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc") // Ensure each booking has createdAt timestamp
      );

      const unsubBookings = onSnapshot(
        q,
        (snap) => {
          const allBookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setBookings(allBookings);
        },
        (err) => console.error("Bookings fetch error:", err)
      );

      return () => unsubBookings();
    } catch (err) {
      console.error("Bookings query failed:", err);
    }
  }, [user]);

  if (loading) return <p className="text-center py-12">Loading your dashboard...</p>;
  if (!profile) return <p className="text-center py-12 text-red-500">Profile not found!</p>;

  return (
    <DashboardLayout
      title={`Welcome Back, ${profile.name || "Traveler"}!`}
      profile={{
        name: profile?.name,
        role: "user",
        profilePic: profile?.profilePic || "",
      }}
    >
      {/* Greeting */}
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Hello, {profile?.name || "Traveler"} 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Explore destinations, book stays, and get AI-powered suggestions!
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActionStrip />

      {/* Recent Bookings */}
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-3">My Recent Trips</h2>
        {bookings.length > 0 ? (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {bookings.map((b) => (
              <li key={b.id} className="flex justify-between border-b py-2">
                <span>{b.listingName || "Trip"}</span>
                <span className="text-gray-500 text-sm">
                  {b.createdAt?.toDate
                    ? b.createdAt.toDate().toLocaleString()
                    : new Date().toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No bookings yet.</p>
        )}
      </div>

      {/* Homepage Sections */}
      <AIRecommendations profile={profile} />
      <TrendingDestinations />
      <PromotionsStrip />
      <RecentStories />
      <MapSection />
      <NewsletterSignup />
    </DashboardLayout>
  );
}

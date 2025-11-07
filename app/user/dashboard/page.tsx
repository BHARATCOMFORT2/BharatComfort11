"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import QuickActionStrip from "@/components/home/QuickActionStrip";
import TrendingDestinations from "@/components/home/TrendingDestinations";
import PromotionsStrip from "@/components/home/PromotionsStrip";
import RecentStories from "@/components/home/RecentStories";
import NewsletterSignup from "@/components/home/NewsletterSignup";
import AIRecommendations from "@/components/home/AIRecommendations";
import MapSection from "@/components/home/MapSection";

/* ============================================================
   🚀 User Dashboard (Fully Connected)
============================================================ */
export default function UserDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [token, setToken] = useState<string>("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* -------------------- Auth & Profile -------------------- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }
      setUser(currentUser);
      const t = await currentUser.getIdToken();
      setToken(t);

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

  /* -------------------- Real-time Bookings -------------------- */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubBookings = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBookings(all);
      },
      (err) => console.error("Bookings fetch error:", err)
    );

    return () => unsubBookings();
  }, [user]);

  /* -------------------- AI Recommendations (from API) -------------------- */
  useEffect(() => {
    if (!token) return;
    const fetchRecommendations = async () => {
      try {
        const res = await fetch("/api/ai/recommendations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.suggestions)) {
          setAiSuggestions(data.suggestions);
        }
      } catch (err) {
        console.warn("AI recommendations error:", err);
      }
    };
    fetchRecommendations();
  }, [token]);

  /* -------------------- Booking Summary (optional API sync) -------------------- */
  useEffect(() => {
    if (!token) return;
    const syncUserBookings = async () => {
      try {
        await fetch("/api/bookings/sync", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.log("Bookings sync skipped:", e);
      }
    };
    syncUserBookings();
  }, [token]);

  /* -------------------- UI -------------------- */
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
          Explore destinations, book stays, and get personalized AI travel plans!
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActionStrip />

      {/* My Trips / Bookings */}
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-3">My Recent Trips</h2>
        {bookings.length > 0 ? (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex justify-between border-b py-2 text-sm"
              >
                <span>
                  {b.listingName || "Trip"}{" "}
                  {b.status === "completed" && (
                    <span className="ml-1 text-green-600">(Completed)</span>
                  )}
                </span>
                <span className="text-gray-500">
                  {b.createdAt?.toDate
                    ? b.createdAt.toDate().toLocaleString()
                    : new Date().toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No bookings yet. Start exploring now!</p>
        )}
      </div>
{/* === Chat Support === */}
<div className="bg-white p-6 rounded-2xl shadow mb-8">
  <h2 className="text-xl font-semibold mb-3">Chat with Support</h2>
  <p className="text-gray-600 mb-3">
    Need help with your booking or planning your trip? Start a chat with our support team.
  </p>
  <button
    onClick={async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/auth/login");

      try {
        const { getDocs, collection, query, where, addDoc, serverTimestamp } = await import(
          "firebase/firestore"
        );

        const chatRef = collection(db, "chats");
        const q = query(chatRef, where("participants", "array-contains", user.uid));
        const snap = await getDocs(q);

        let chatId = snap.docs[0]?.id;
        if (!chatId) {
          const docRef = await addDoc(chatRef, {
            participants: [user.uid, "admin_support"],
            type: "support",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: "Chat initiated by user",
          });
          chatId = docRef.id;
        }

        router.push(`/chat/${chatId}`);
      } catch (err) {
        console.error("Chat initiation error:", err);
        alert("Something went wrong while starting chat. Try again.");
      }
    }}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
  >
    Open Chat
  </button>
</div>
      {/* AI Recommendations */}
      {aiSuggestions.length > 0 && (
        <AIRecommendations suggestions={aiSuggestions} profile={profile} />
      )}

      {/* Homepage Sections */}
      <TrendingDestinations />
      <PromotionsStrip />
      <RecentStories />
      <MapSection />
      <NewsletterSignup />
    </DashboardLayout>
  );
}

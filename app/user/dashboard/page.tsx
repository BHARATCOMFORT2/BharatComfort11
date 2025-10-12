"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
import { openRazorpayCheckout, createOrder } from "@/lib/payments-razorpay";

interface Booking {
  id: string;
  listingName?: string;
  date: string;
  amount?: number;
}

interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  image?: string;
  bookingsCount?: number;
  partnerId?: string;
}

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ bookings: 0, upcoming: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [allStays, setAllStays] = useState<Stay[]>([]);

  // ------------------- Auth & Profile -------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return router.push("/auth/login");

      setUser(currentUser);

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setProfile({ name: "User", role: "user", profilePic: "" });
          setLoading(false);
          return;
        }

        const data = userSnap.data();
        if (data.role !== "user") {
          alert("Not authorized");
          router.push("/");
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error("Error loading profile:", err);
        setProfile({ name: "User", role: "user", profilePic: "" });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  // ------------------- Real-time Bookings -------------------
  useEffect(() => {
    if (!user) return;

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(
      bookingsQuery,
      (snap) => {
        const allBookings: Booking[] = snap.docs.map((d) => ({
          id: d.id,
          listingName: d.data().listingName,
          date: d.data().date,
          amount: d.data().amount,
        }));

        const totalSpent = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const upcoming = allBookings.filter((b) => b.date && new Date(b.date) > new Date()).length;

        setStats({ bookings: allBookings.length, upcoming, spent: totalSpent });
        setRecentBookings(allBookings.slice(0, 5));
      },
      (err) => console.error("Error fetching bookings:", err)
    );

    return () => unsub();
  }, [user]);

  // ------------------- Real-time Stays -------------------
  useEffect(() => {
    const staysQuery = query(collection(db, "stays"), orderBy("bookingsCount", "desc"));

    const unsubStays = onSnapshot(
      staysQuery,
      (snap) => {
        const stays: Stay[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          location: d.data().location,
          price: d.data().price,
          image: d.data().image,
          bookingsCount: d.data().bookingsCount,
          partnerId: d.data().partnerId,
        }));

        setAllStays(stays);
      },
      (err) => console.error("Error fetching stays:", err)
    );

    return () => unsubStays();
  }, []);

  // ------------------- Razorpay Booking -------------------
  const handleBookingPayment = async (stay: Stay) => {
    try {
      const order = await createOrder({ amount: stay.price });
      openRazorpayCheckout({
        amount: stay.price,
        orderId: order.id,
        name: profile?.name || "Booking",
        email: profile?.email || "",
        onSuccess: (res) => alert("Payment successful!"),
        onFailure: (err) => alert("Payment failed!"),
      });
    } catch (err) {
      console.error("Razorpay error:", err);
      alert("Unable to create payment order");
    }
  };

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <DashboardLayout
      title="User Dashboard"
      profile={{ name: profile?.name, role: "user", profilePic: profile?.profilePic }}
    >
      {/* ---------------- Stats ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* ---------------- Recent Bookings ---------------- */}
      <div className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {recentBookings.map((b) => (
              <li key={b.id} className="border rounded-lg p-2 flex justify-between">
                <span>{b.listingName || "Trip"}</span>
                <span className="text-gray-400 text-sm">{new Date(b.date).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------- All Stays (Book Now) ---------------- */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">All Stays / Listings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allStays.map((stay) => (
            <div key={stay.id} className="bg-white shadow rounded-2xl p-4 flex flex-col">
              <img
                src={stay.image || "/default-stay.jpg"}
                alt={stay.name}
                className="w-full h-48 object-cover rounded-xl mb-2 shadow"
              />
              <h3 className="font-semibold text-lg">{stay.name}</h3>
              <p className="text-gray-500">{stay.location}</p>
              <p className="text-indigo-600 font-bold mt-1">₹{stay.price}</p>
              <button
                className="mt-2 bg-indigo-600 text-white py-1 px-3 rounded hover:bg-indigo-700"
                onClick={() => handleBookingPayment(stay)}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- Homepage Sections ---------------- */}
      <Hero />
      <QuickActionStrip />
      <FeaturedListings />
      <PromotionsStrip />
      <TrendingDestinations />
      <RecentStories />
      <Testimonials />
      <NewsletterSignup />

      {/* ---------------- AI Recommendations ---------------- */}
      <section className="container mx-auto px-4 py-12">
        <AIRecommendations profile={profile} />
      </section>

      <Footer />
    </DashboardLayout>
  );
}

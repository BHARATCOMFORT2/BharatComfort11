"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Loading from "@/components/Loading";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

// ---------------- TYPES ----------------
interface Booking {
  id: string;
  listingId?: string;
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
  type: "stay" | "listing";
  bookingsCount?: number;
  partnerId: string;
}

// ---------------- DASHBOARD COMPONENT ----------------
export default function UserDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats & Bookings
  const [stats, setStats] = useState({ bookings: 0, upcoming: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  // Stays & Recommendations
  const [allStays, setAllStays] = useState<Stay[]>([]);
  const [trending, setTrending] = useState<Stay[]>([]);
  const [recommended, setRecommended] = useState<Stay[]>([]);

  // ---------------- LOAD USER PROFILE ----------------
  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/auth/login");

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || userDoc.data().role !== "user") {
          alert("❌ Not authorized");
          return router.push("/");
        }

        setProfile(userDoc.data());
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // ---------------- REAL-TIME BOOKINGS ----------------
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(bookingsQuery, (snap) => {
      const allBookings: Booking[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Booking, "id">),
      }));

      const totalSpent = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const upcoming = allBookings.filter(
        (b) => b.date && new Date(b.date) > new Date()
      ).length;

      setStats({ bookings: allBookings.length, upcoming, spent: totalSpent });
      setRecentBookings(allBookings.slice(0, 5));

      // Recommended stays: exclude booked ones
      const bookedIds = allBookings.map((b) => b.listingId);
      setRecommended(allStays.filter((s) => !bookedIds.includes(s.id)).slice(0, 6));
    });

    return () => unsub();
  }, [allStays]);

  // ---------------- REAL-TIME STAYS ----------------
  useEffect(() => {
    const staysQuery = query(collection(db, "stays"), orderBy("bookingsCount", "desc"));

    const unsubStays = onSnapshot(staysQuery, (snap) => {
      const stays: Stay[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Stay, "id">),
      }));

      setAllStays(stays);
      setTrending(stays.slice(0, 6));
    });

    return () => unsubStays();
  }, []);

  // ---------------- BOOKING FUNCTION ----------------
  const handleBooking = async (stay: Stay) => {
    const user = auth.currentUser;
    if (!user) return alert("Login required");

    const checkIn = prompt("Enter check-in date (YYYY-MM-DD)") || "";
    const checkOut = prompt("Enter check-out date (YYYY-MM-DD)") || "";
    const guests = Number(prompt("Number of guests") || 1);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          partnerId: stay.partnerId,
          listingId: stay.id,
          amount: stay.price,
          checkIn,
          checkOut,
          guests,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Booking creation failed");

      openRazorpayCheckout({
        amount: stay.price,
        orderId: data.order.id,
        name: stay.name,
        email: user.email || "",
        onSuccess: (resp) => alert("✅ Payment successful: " + resp.razorpay_payment_id),
        onFailure: (err) => alert("❌ Payment failed: " + err.error),
      });
    } catch (err: any) {
      console.error("Booking error:", err);
      alert("Booking failed: " + err.message);
    }
  };

  if (loading) return <Loading message="Loading your dashboard..." />;
  if (!profile)
    return (
      <div className="flex justify-center items-center h-[60vh] text-gray-500">
        No profile found.
      </div>
    );

  // ---------------- RENDER DASHBOARD ----------------
  return (
    <DashboardLayout
      title="User Dashboard"
      profile={{ name: profile.name, role: "user", profilePic: profile.profilePic }}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {recentBookings.map((b) => (
              <li key={b.id} className="border rounded-lg p-2 flex justify-between">
                <span>{b.listingName || "Trip"}</span>
                <span className="text-gray-400 text-sm">
                  {new Date(b.date).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Trending Stays */}
      <Section title="Trending Destinations" items={trending} onBook={handleBooking} />

      {/* Recommended Stays */}
      <Section title="Recommended for You" items={recommended} onBook={handleBooking} />
    </DashboardLayout>
  );
}

// ---------------- DASHBOARD ITEM SECTION ----------------
function Section({ title, items, onBook }: { title: string; items: Stay[]; onBook: (item: Stay) => void }) {
  if (!items.length)
    return (
      <div className="mb-12">
        {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
        <p className="text-center text-gray-500">No items found.</p>
      </div>
    );

  return (
    <div className="mb-12">
      {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white shadow rounded-2xl p-4 flex flex-col">
            <img
              src={item.image || "/default-stay.jpg"}
              alt={item.name}
              className="w-full h-48 object-cover rounded-xl mb-2 shadow"
            />
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <p className="text-gray-500">{item.location}</p>
            <p className="text-indigo-600 font-bold mt-1">₹{item.price}</p>
            <button
              onClick={() => onBook(item)}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Book Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

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
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

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
  bookingsCount?: number;
  partnerId?: string;
  type?: "stay" | "listing";
}

interface Filters {
  type?: "stay" | "listing";
  location?: string;
  minPrice?: number;
  maxPrice?: number;
}

export default function UserDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ bookings: 0, upcoming: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  const [allStays, setAllStays] = useState<Stay[]>([]);
  const [trending, setTrending] = useState<Stay[]>([]);
  const [recommended, setRecommended] = useState<Stay[]>([]);
  const [filters, setFilters] = useState<Filters>({});

  // ------------------- Auth + Profile -------------------
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return router.push("/auth/login");

      setUser(currentUser);

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists() || userSnap.data().role !== "user") {
          alert("Not authorized");
          return router.push("/");
        }

        setProfile(userSnap.data());
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  // ------------------- Real-time bookings -------------------
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
          listingId: d.data().listingId,
          listingName: d.data().listingName,
          date: d.data().date,
          amount: d.data().amount,
        }));

        const totalSpent = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
        const upcoming = allBookings.filter((b) => b.date && new Date(b.date) > new Date()).length;

        setStats({ bookings: allBookings.length, upcoming, spent: totalSpent });

        const recent = allBookings
          .filter((b) => b.date)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

        setRecentBookings(recent);

        // Recommended (not booked)
        const bookedIds = allBookings.map((b) => b.listingId).filter(Boolean);
        setRecommended((prev) => prev.filter((s) => !bookedIds.includes(s.id)));
      },
      (err) => console.error("Error fetching bookings:", err)
    );

    return () => unsub();
  }, [user]);

  // ------------------- Real-time stays -------------------
  useEffect(() => {
    const staysQuery = query(collection(db, "stays"), orderBy("bookingsCount", "desc"));

    const unsub = onSnapshot(
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
          type: d.data().type,
        }));

        setAllStays(stays);
        setTrending(stays.slice(0, 6));
        // Update recommended after stays are loaded
        if (recentBookings.length > 0) {
          const bookedIds = recentBookings.map((b) => b.listingId).filter(Boolean);
          setRecommended(stays.filter((s) => !bookedIds.includes(s.id)).slice(0, 6));
        } else {
          setRecommended(stays.slice(0, 6));
        }
      },
      (err) => console.error("Error fetching stays:", err)
    );

    return () => unsub();
  }, [recentBookings]);

  // ------------------- Filters -------------------
  const handleFilterChange = (field: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const filteredStays = allStays.filter((stay) => {
    if (filters.type && stay.type !== filters.type) return false;
    if (filters.location && !stay.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.minPrice && stay.price < filters.minPrice) return false;
    if (filters.maxPrice && stay.price > filters.maxPrice) return false;
    return true;
  });

  // ------------------- Booking -------------------
  const handleBooking = async (stay: Stay) => {
    if (!user) return alert("Login required");

    const checkIn = prompt("Check-in date (YYYY-MM-DD)") || "";
    const checkOut = prompt("Check-out date (YYYY-MM-DD)") || "";
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
      if (!data.success) throw new Error(data.error || "Booking failed");

      openRazorpayCheckout({
        amount: stay.price,
        orderId: data.order.id,
        name: stay.name,
        email: user.email || "",
        onSuccess: (resp) => alert("Payment successful ✅: " + resp.razorpay_payment_id),
        onFailure: (err) => alert("Payment failed ❌: " + err.error),
      });
    } catch (err: any) {
      console.error("Booking error:", err);
      alert("Booking failed: " + err.message);
    }
  };

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;
  if (!profile) return <p className="text-center py-12 text-red-500">Profile not found!</p>;

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
                <span className="text-gray-400 text-sm">{new Date(b.date).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Trending */}
      <Section title="Trending Destinations" items={trending} onBook={handleBooking} />
      {/* Recommended */}
      <Section title="Recommended for You" items={recommended} onBook={handleBooking} />

      {/* Filters */}
      <h2 className="text-2xl font-bold mb-4">Explore All</h2>
      <div className="mb-4 flex flex-wrap gap-4">
        <input type="text" placeholder="Location" onChange={(e) => handleFilterChange("location", e.target.value)} className="p-2 rounded-lg border" />
        <select onChange={(e) => handleFilterChange("type", e.target.value ? (e.target.value as "stay" | "listing") : undefined)} className="p-2 rounded-lg border">
          <option value="">All Types</option>
          <option value="stay">Stay</option>
          <option value="listing">Listing</option>
        </select>
        <input type="number" placeholder="Min Price" onChange={(e) => handleFilterChange("minPrice", Number(e.target.value))} className="p-2 rounded-lg border" />
        <input type="number" placeholder="Max Price" onChange={(e) => handleFilterChange("maxPrice", Number(e.target.value))} className="p-2 rounded-lg border" />
      </div>

      <Section title="" items={filteredStays} onBook={handleBooking} />
    </DashboardLayout>
  );
}

// ------------------- Section Component -------------------
function Section({ title, items, onBook }: { title: string; items: Stay[]; onBook: (item: Stay) => void }) {
  if (!items.length) return <div className="mb-12">{title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}<p className="text-center text-gray-500">No items found.</p></div>;

  return (
    <div className="mb-12">
      {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white shadow rounded-2xl p-4 flex flex-col">
            <img src={item.image || "/default-stay.jpg"} alt={item.name} className="w-full h-48 object-cover rounded-xl mb-2 shadow" />
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <p className="text-gray-500">{item.location}</p>
            <p className="text-indigo-600 font-bold mt-1">₹{item.price}</p>
            <button onClick={() => onBook(item)} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Book Now</button>
          </div>
        ))}
      </div>
    </div>
  );
}

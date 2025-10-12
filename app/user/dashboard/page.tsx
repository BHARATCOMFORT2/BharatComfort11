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

interface Booking {
  id: string;
  listingName?: string;
  date: string;
  amount?: number;
}

interface Item {
  id: string;
  name: string;
  location: string;
  price: number;
  image?: string;
  type: "stay" | "listing";
  bookingsCount?: number;
  partnerId: string;
}

interface Filters {
  type?: "stay" | "listing";
  location?: string;
  minPrice?: number;
  maxPrice?: number;
}

export default function UserDashboardFinal() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ bookings: 0, upcoming: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  const [trending, setTrending] = useState<Item[]>([]);
  const [recommended, setRecommended] = useState<Item[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [filters, setFilters] = useState<Filters>({});

  // ✅ Auth listener (guarantees user available before fetching)
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      setUser(currentUser);

      // Fetch user profile
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          alert("⚠️ Profile not found. Please complete signup.");
          router.push("/");
          return;
        }

        const data = userSnap.data();
        if (data.role !== "user") {
          alert("❌ Not authorized to access user dashboard");
          router.push("/");
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  // ✅ Fetch bookings, stats & recommendations
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const bookingsSnap = await getDocs(
          query(collection(db, "bookings"), where("userId", "==", user.uid))
        );

        const totalSpent = bookingsSnap.docs.reduce(
          (sum, b) => sum + (b.data().amount || 0),
          0
        );

        const upcoming = bookingsSnap.docs.filter(
          (b) => new Date(b.data().date) > new Date()
        ).length;

        setStats({
          bookings: bookingsSnap.size,
          upcoming,
          spent: totalSpent,
        });

        const recent: Booking[] = bookingsSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Partial<Booking>) }))
          .filter((b): b is Booking => !!b.date)
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          .slice(0, 5);

        setRecentBookings(recent);

        const bookedIds = bookingsSnap.docs.map((b) => b.data().listingId);
        const staysSnap = await getDocs(collection(db, "stays"));
        const items: Item[] = staysSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Item)
        );

        setAllItems(items);
        const recommendedItems = items
          .filter((i) => !bookedIds.includes(i.id))
          .slice(0, 6);
        setRecommended(recommendedItems);
      } catch (err) {
        console.error("Error fetching user dashboard data:", err);
      }
    };

    fetchData();
  }, [user]);

  // ✅ Real-time trending data
  useEffect(() => {
    const q = query(collection(db, "stays"), orderBy("bookingsCount", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const trendingItems = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Item))
        .slice(0, 6);
      setTrending(trendingItems);
    });
    return () => unsub();
  }, []);

  // ✅ Filters
  const handleFilterChange = (field: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const filteredItems = allItems.filter((item) => {
    if (filters.type && item.type !== filters.type) return false;
    if (
      filters.location &&
      !item.location.toLowerCase().includes(filters.location.toLowerCase())
    )
      return false;
    if (filters.minPrice && item.price < filters.minPrice) return false;
    if (filters.maxPrice && item.price > filters.maxPrice) return false;
    return true;
  });

  // ✅ Booking
  const handleBooking = async (item: Item) => {
    if (!user) return alert("Login required");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          partnerId: item.partnerId,
          listingId: item.id,
          amount: item.price,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      openRazorpayCheckout({
        amount: item.price,
        orderId: data.order.id,
        name: item.name,
        email: user.email || "",
        onSuccess: (resp) =>
          alert("✅ Payment successful: " + resp.razorpay_payment_id),
        onFailure: (err) => alert("❌ Payment failed: " + err.error),
      });
    } catch (err: any) {
      console.error(err);
      alert("Booking failed: " + err.message);
    }
  };

  // ✅ Loading / fallback UI
  if (loading) return <Loading message="Loading your dashboard..." />;
  if (!profile)
    return (
      <div className="flex justify-center items-center h-[60vh] text-gray-500">
        No profile found.
      </div>
    );

  // ✅ Main Render
  return (
    <DashboardLayout
      title="User Dashboard"
      profile={{
        name: profile.name,
        role: "user",
        profilePic: profile.profilePic,
      }}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div
            key={key}
            className="p-6 bg-white shadow rounded-2xl text-center"
          >
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
            {recentBookings.map((b, idx) => (
              <li
                key={idx}
                className="border rounded-lg p-2 flex justify-between items-center"
              >
                <span>{b.listingName || "Trip"}</span>
                <span className="text-gray-400 text-sm">
                  {new Date(b.date).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Trending */}
      <Section title="Trending Destinations" items={trending} onBook={handleBooking} />

      {/* Recommended */}
      <Section title="Recommended for You" items={recommended} onBook={handleBooking} />

      {/* Explore */}
      <h2 className="text-2xl font-bold mb-4">Explore All</h2>
      <div className="mb-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Location"
          onChange={(e) => handleFilterChange("location", e.target.value)}
          className="p-2 rounded-lg border"
        />
        <select
          onChange={(e) =>
            handleFilterChange(
              "type",
              e.target.value ? (e.target.value as "stay" | "listing") : undefined
            )
          }
          className="p-2 rounded-lg border"
        >
          <option value="">All Types</option>
          <option value="stay">Stay</option>
          <option value="listing">Listing</option>
        </select>
        <input
          type="number"
          placeholder="Min Price"
          onChange={(e) =>
            handleFilterChange("minPrice", Number(e.target.value))
          }
          className="p-2 rounded-lg border"
        />
        <input
          type="number"
          placeholder="Max Price"
          onChange={(e) =>
            handleFilterChange("maxPrice", Number(e.target.value))
          }
          className="p-2 rounded-lg border"
        />
      </div>

      <Section title="" items={filteredItems} onBook={handleBooking} />
    </DashboardLayout>
  );
}

// ✅ Subcomponent for displaying items
function Section({
  title,
  items,
  onBook,
}: {
  title: string;
  items: Item[];
  onBook: (item: Item) => void;
}) {
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
          <div
            key={item.id}
            className="bg-white shadow rounded-2xl p-4 flex flex-col"
          >
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

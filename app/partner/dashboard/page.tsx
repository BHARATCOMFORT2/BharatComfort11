"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import PartnerListingsManager from "@/components/dashboard/PartnerListingsManager"; // ✅ Unified component

// ================= TYPES =================
interface Booking {
  id: string;
  userName?: string;
  customerName?: string;
  date: string;
  amount?: number;
}

// ================= MAIN COMPONENT =================
export default function PartnerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ listings: 0, bookings: 0, earnings: 0 });
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let unsubListings: any = null;
    let unsubBookings: any = null;

    const init = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return router.push("/auth/login");

        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists() || userSnap.data().role !== "partner") {
          alert("❌ Not authorized");
          router.push("/");
          return;
        }

        setProfile(userSnap.data());
        const uid = user.uid;

        // --- Real-time LISTINGS COUNT ---
        const listingsQuery = query(
          collection(db, "listings"),
          where("createdBy", "==", uid)
        );
        unsubListings = onSnapshot(listingsQuery, (snap) => {
          setStats((prev) => ({ ...prev, listings: snap.size }));
        });

        // --- Real-time BOOKINGS ---
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("partnerId", "==", uid),
          orderBy("createdAt", "desc")
        );
        unsubBookings = onSnapshot(bookingsQuery, (snap) => {
          const bookings = snap.docs.map((d) => ({
  ...(d.data() as Booking),
  id: d.id, // add after spread
}));


          const total = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
          setStats((prev) => ({
            ...prev,
            bookings: bookings.length,
            earnings: total,
          }));

          // Chart data (last 7 days)
          const today = new Date();
          const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - i);
            return { date: d.toISOString().split("T")[0], count: 0 };
          }).reverse();

          bookings.forEach((b) => {
            const date = b.date?.split?.("T")?.[0];
            const match = last7Days.find((x) => x.date === date);
            if (match) match.count += 1;
          });

          setRecentBookings(bookings.slice(0, 10));
          setChartData(last7Days);
          setLoading(false);
        });

        setTimeout(() => setLoading(false), 8000); // fallback
      } catch (err) {
        console.error("🔥 PartnerDashboard init error:", err);
        setLoading(false);
      }
    };

    init();
    return () => {
      if (unsubListings) unsubListings();
      if (unsubBookings) unsubBookings();
    };
  }, [router]);

  if (loading)
    return <p className="text-center py-12 text-gray-600">Loading dashboard...</p>;

  return (
    <DashboardLayout
      title="Partner Dashboard"
      profile={{
        name: profile?.businessName || profile?.name,
        role: "partner",
        profilePic: profile?.profilePic,
      }}
    >
      {/* ==================== STATS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* ==================== BOOKINGS CHART ==================== */}
      <div className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-lg font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ==================== MANAGE LISTINGS ==================== */}
      <section className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-xl font-semibold mb-6">Manage Your Listings</h3>
        <PartnerListingsManager /> {/* ✅ Embedded unified manager */}
      </section>
    </DashboardLayout>
  );
}

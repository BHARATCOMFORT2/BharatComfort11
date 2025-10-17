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

interface Booking {
  id: string;
  userName?: string;
  customerName?: string;
  date: string;
  amount?: number;
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ listings: 0, bookings: 0, earnings: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/auth/login");

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists() || userSnap.data().role !== "partner") {
        alert("❌ Not authorized");
        return router.push("/");
      }

      setProfile(userSnap.data());
      const uid = user.uid;

      // --- Real-time listings count
      const listingsQuery = query(
        collection(db, "listings"),
        where("createdBy", "==", uid)
      );
      const unsubListings = onSnapshot(listingsQuery, (snap) => {
        setStats((prev) => ({ ...prev, listings: snap.size }));
      });

      // --- Real-time bookings + earnings
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("partnerId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const unsubBookings = onSnapshot(bookingsQuery, (snap) => {
        let total = 0;
        const bookings: Booking[] = snap.docs.map((d) => {
          const data = d.data() as any;
          total += data.amount || 0;
          return {
            id: d.id,
            userName: data.userName,
            customerName: data.customerName,
            date: data.date || data.createdAt?.toDate()?.toISOString() || "",
            amount: data.amount,
          };
        });

        setStats((prev) => ({
          ...prev,
          bookings: bookings.length,
          earnings: total,
        }));

        // Sort + trim for recent display
        const sorted = bookings
          .filter((b) => b.date)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

        setRecentBookings(sorted);

        // Build last 7 days chart data
        const today = new Date();
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(today.getDate() - i);
          return { date: d.toISOString().split("T")[0], count: 0 };
        }).reverse();

        bookings.forEach((b) => {
          const date = b.date?.split("T")[0];
          const day = last7Days.find((d) => d.date === date);
          if (day) day.count += 1;
        });

        setChartData(last7Days);
      });

      setLoading(false);

      return () => {
        unsubListings();
        unsubBookings();
      };
    };

    init();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <DashboardLayout
      title="Partner Dashboard"
      profile={{
        name: profile?.businessName || profile?.name,
        role: "partner",
        profilePic: profile?.profilePic,
      }}
    >
      {/* --- STATS --- */}
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

      {/* --- BOOKINGS CHART --- */}
      <div className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-lg font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* --- RECENT BOOKINGS --- */}
      <div className="bg-white shadow rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 && <p>No bookings yet.</p>}
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {recentBookings.map((b, idx) => (
            <li
              key={idx}
              className="border rounded-lg p-2 flex justify-between"
            >
              <span>{b.userName || b.customerName || "Customer"}</span>
              <span className="text-gray-400 text-sm">
                {new Date(b.date).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function PartnerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ listings: 0, bookings: 0, earnings: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [bookingChartData, setBookingChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return router.push("/auth/login");
      }

      try {
        // 1️⃣ Check role
        const usersSnap = await getDocs(collection(db, "users"));
        const currentUser = usersSnap.docs.find(d => d.id === user.uid);
        if (!currentUser || currentUser.data().role !== "partner") {
          alert("❌ Not authorized");
          setLoading(false);
          return router.push("/");
        }

        // 2️⃣ Fetch listings and bookings
        const listingsSnap = await getDocs(query(collection(db, "listings"), where("partnerId", "==", user.uid)));
        const bookingsSnap = await getDocs(query(collection(db, "bookings"), where("partnerId", "==", user.uid)));

        // 3️⃣ Calculate stats
        const totalEarnings = bookingsSnap.docs.reduce((sum, b) => sum + (b.data().amount || 0), 0);
        setStats({
          listings: listingsSnap.size,
          bookings: bookingsSnap.size,
          earnings: totalEarnings
        });

        // 4️⃣ Process recent bookings
        const recent = bookingsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => b.date) // ensure date exists
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

        setRecentBookings(recent);

        // 5️⃣ Prepare booking chart (last 7 days)
        const today = new Date();
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(today.getDate() - i);
          return { date: d.toISOString().split("T")[0], count: 0 };
        }).reverse();

        recent.forEach(b => {
          const dateStr = new Date(b.date).toISOString().split("T")[0];
          const day = last7Days.find(d => d.date === dateStr);
          if (day) day.count += 1;
        });

        setBookingChartData(last7Days);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        alert("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <header className="flex justify-between mb-8">
        <h1 className="text-2xl font-bold">Partner Dashboard</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => auth.signOut().then(() => router.push("/auth/login"))}
        >
          Logout
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* Booking chart */}
      <div className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-lg font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={bookingChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent bookings */}
      <div className="bg-white shadow rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 && <p>No bookings yet.</p>}
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {recentBookings.map((b, idx) => (
            <li key={idx} className="border rounded-lg p-2 flex justify-between">
              <span>{b.userName || b.customerName}</span>
              <span className="text-gray-400 text-sm">{new Date(b.date).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
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

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "partner") {
        alert("❌ Not authorized");
        return router.push("/");
      }

      setProfile(userDoc.data());

      const listingsSnap = await getDocs(query(collection(db, "listings"), where("partnerId", "==", user.uid)));
      const bookingsSnap = await getDocs(query(collection(db, "bookings"), where("partnerId", "==", user.uid)));

      const totalEarnings = bookingsSnap.docs.reduce((sum, b) => sum + (b.data().amount || 0), 0);
      setStats({ listings: listingsSnap.size, bookings: bookingsSnap.size, earnings: totalEarnings });

      const recent: Booking[] = bookingsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Partial<Booking>) }))
        .filter((b): b is Booking => !!b.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      setRecentBookings(recent);

      const today = new Date();
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - i);
        return { date: d.toISOString().split("T")[0], count: 0 };
      }).reverse();

      recent.forEach((b) => {
        const date = b.date.split("T")[0];
        const day = last7Days.find((d) => d.date === date);
        if (day) day.count += 1;
      });

      setChartData(last7Days);
      setLoading(false);
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

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

      <div className="bg-white shadow rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 && <p>No bookings yet.</p>}
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {recentBookings.map((b, idx) => (
            <li key={idx} className="border rounded-lg p-2 flex justify-between">
              <span>{b.userName || b.customerName || "Customer"}</span>
              <span className="text-gray-400 text-sm">{new Date(b.date).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}

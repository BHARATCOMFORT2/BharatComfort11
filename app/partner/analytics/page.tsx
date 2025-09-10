"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function PartnerAnalyticsPage() {
  const [stats, setStats] = useState({
    totalViews: 0,
    totalBookings: 0,
    revenue: 0,
  });
  const [trend, setTrend] = useState<
    { date: string; views: number; bookings: number }[]
  >([]);

  useEffect(() => {
    const fetchStats = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // Example Firestore query: get all listings by partner
      const q = query(collection(db, "listings"), where("partnerId", "==", user.uid));
      const snap = await getDocs(q);

      let totalViews = 0;
      let totalBookings = 0;
      let revenue = 0;

      snap.forEach((doc) => {
        const data = doc.data();
        totalViews += data.views || 0;
        totalBookings += data.bookings || 0;
        revenue += data.revenue || 0;
      });

      setStats({ totalViews, totalBookings, revenue });

      // Mock trend data (replace later with real analytics logs)
      setTrend([
        { date: "Mon", views: 20, bookings: 2 },
        { date: "Tue", views: 50, bookings: 5 },
        { date: "Wed", views: 35, bookings: 3 },
        { date: "Thu", views: 80, bookings: 7 },
        { date: "Fri", views: 120, bookings: 12 },
        { date: "Sat", views: 200, bookings: 15 },
        { date: "Sun", views: 150, bookings: 10 },
      ]);
    };

    fetchStats();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">Analytics Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold">Total Views</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.totalViews}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold">Bookings</h2>
          <p className="text-3xl font-bold text-green-600">
            {stats.totalBookings}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold">Revenue</h2>
          <p className="text-3xl font-bold text-purple-600">₹{stats.revenue}</p>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Weekly Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

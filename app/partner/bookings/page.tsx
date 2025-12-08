"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { apiFetch } from "@/lib/apiFetch";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function PartnerBookingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topListings, setTopListings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        /* ✅ 1️⃣ LOAD PARTNER BOOKINGS */
        const bookingRes = await apiFetch("/api/partners/bookings");
        const bookingJson = await bookingRes.json();

        if (bookingJson?.ok) {
          const list = bookingJson.bookings || [];
          setBookings(list);

          setStats({
            totalBookings: bookingJson.total || list.length,
            totalRevenue: list.reduce(
              (a: number, b: any) => a + Number(b.amount || 0),
              0
            ),
          });
        }

        /* ✅ 2️⃣ LOAD INSIGHTS (Daily Chart) */
        const insightsRes = await apiFetch("/api/partners/insights?days=7");
        const insights = await insightsRes.json();

        if (insights?.ok) {
          setChartData(
            (insights.bookingsPerDay || []).map((d: any) => ({
              date: new Date(d.day).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              }),
              count: d.count,
            }))
          );
        }

        /* ✅ 3️⃣ TOP PERFORMING LISTINGS (From bookings only) */
        const grouped: Record<string, number> = {};
        bookingJson.bookings?.forEach((b: any) => {
          const id = b.listingId || "unknown";
          grouped[id] = (grouped[id] || 0) + 1;
        });

        const sorted = Object.entries(grouped)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([listingId, count]) => ({ listingId, count }));

        setTopListings(sorted);
      } catch (err) {
        console.error("Partner bookings load error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  if (loading)
    return <p className="text-center py-10">Loading partner bookings…</p>;

  return (
    <DashboardLayout
      title="Partner Bookings"
      profile={{ name: "Partner", role: "partner" }}
    >
      {/* ✅ STATS */}
      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <h2 className="text-3xl font-bold">{stats.totalBookings}</h2>
          <p className="text-gray-600">Total Bookings</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow text-center">
          <h2 className="text-3xl font-bold">
            ₹{stats.totalRevenue.toLocaleString("en-IN")}
          </h2>
          <p className="text-gray-600">Total Revenue</p>
        </div>
      </div>

      {/* ✅ DAILY BOOKING CHART */}
      <div className="bg-white p-6 rounded-2xl shadow mb-10">
        <h3 className="font-semibold mb-4">Bookings (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line dataKey="count" stroke="#16a34a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ TOP PERFORMING LISTINGS */}
      <div className="bg-white p-6 rounded-2xl shadow mb-10">
        <h3 className="font-semibold mb-4">Top Performing Listings</h3>

        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={topListings}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="listingId" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ BOOKINGS LIST TABLE */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h3 className="text-xl font-semibold mb-4">Your Bookings</h3>

        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="border rounded-lg p-3 flex justify-between"
              >
                <span className="text-sm text-gray-700">{b.id}</span>
                <span className="font-semibold text-green-600">
                  ₹{b.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

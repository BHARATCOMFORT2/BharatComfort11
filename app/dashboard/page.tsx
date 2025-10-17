"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Listing {
  id: string;
  name: string;
  location: string;
  status: string;
  createdBy: string;
  createdAt?: any;
}

interface Booking {
  id: string;
  listingId: string;
  totalPrice: number;
  userId: string;
  createdAt?: any;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  userId: string;
  createdAt?: any;
}

export default function DashboardPage() {
  const { firebaseUser, profile, loading } = useAuth(); // ✅ corrected
  const [stats, setStats] = useState({
    listings: 0,
    approved: 0,
    pending: 0,
    bookings: 0,
    payments: 0,
    revenue: 0,
  });

  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // ✅ Real-time dashboard data
  useEffect(() => {
    if (!firebaseUser || !profile) return;
    const isAdmin = profile.role === "admin";

    // --- LISTINGS ---
    const listingsQuery = isAdmin
      ? query(collection(db, "listings"), orderBy("createdAt", "desc"))
      : query(
          collection(db, "listings"),
          where("createdBy", "==", firebaseUser.uid),
          orderBy("createdAt", "desc")
        );

    const unsubListings = onSnapshot(listingsQuery, (snap) => {
      const all = snap.docs.map((d) => {
        const data = d.data() as Listing;
        return { ...data, id: d.id }; // ✅ prevent duplicate id
      });

      const approved = all.filter((l) => l.status === "approved").length;
      const pending = all.filter((l) => l.status === "pending").length;

      setStats((prev) => ({
        ...prev,
        listings: all.length,
        approved,
        pending,
      }));
      setRecentListings(all.slice(0, 5));
    });

    // --- BOOKINGS ---
    const bookingsQuery = isAdmin
      ? query(collection(db, "bookings"), orderBy("createdAt", "desc"))
      : query(
          collection(db, "bookings"),
          where("userId", "==", firebaseUser.uid),
          orderBy("createdAt", "desc")
        );

    const unsubBookings = onSnapshot(bookingsQuery, (snap) => {
      const all = snap.docs.map((d) => d.data() as Booking);
      setStats((prev) => ({
        ...prev,
        bookings: all.length,
      }));
      setRecentBookings(all.slice(0, 5));
    });

    // --- PAYMENTS ---
    const paymentsQuery = isAdmin
      ? query(collection(db, "payments"), orderBy("createdAt", "desc"))
      : query(
          collection(db, "payments"),
          where("userId", "==", firebaseUser.uid),
          orderBy("createdAt", "desc")
        );

    const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
      const all = snap.docs.map((d) => d.data() as Payment);
      const revenue = all
        .filter((p) => p.status === "success")
        .reduce((acc, p) => acc + (p.amount || 0), 0);

      // Group payments by month for chart
      const grouped = all.reduce((acc: any, p) => {
        const month = new Date(p.createdAt?.seconds * 1000 || Date.now())
          .toLocaleString("default", { month: "short" });
        acc[month] = (acc[month] || 0) + (p.amount || 0);
        return acc;
      }, {});
      const chart = Object.keys(grouped).map((month) => ({
        month,
        revenue: grouped[month],
      }));

      setStats((prev) => ({
        ...prev,
        payments: all.length,
        revenue,
      }));
      setRecentPayments(all.slice(0, 5));
      setChartData(chart);
    });

    return () => {
      unsubListings();
      unsubBookings();
      unsubPayments();
    };
  }, [firebaseUser, profile]);

  // --- UI States ---
  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 animate-pulse">
        Loading dashboard...
      </div>
    );

  if (!firebaseUser)
    return (
      <div className="p-10 text-center text-gray-600">
        Please log in to access your dashboard.
      </div>
    );

  if (!profile)
    return (
      <div className="p-10 text-center text-gray-500">Loading profile...</div>
    );

  const isAdmin = profile.role === "admin";

  // --- Render ---
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">
          {isAdmin ? "Admin Dashboard" : "Partner Dashboard"}
        </h1>
        <p className="text-gray-500">
          Welcome back, {profile.displayName || firebaseUser.email}
        </p>
      </header>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Card className="p-6 text-center shadow">
          <h2 className="text-lg font-semibold">Total Listings</h2>
          <p className="text-3xl font-bold text-blue-600">{stats.listings}</p>
        </Card>
        <Card className="p-6 text-center shadow">
          <h2 className="text-lg font-semibold">Approved</h2>
          <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
        </Card>
        <Card className="p-6 text-center shadow">
          <h2 className="text-lg font-semibold">Pending</h2>
          <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
        </Card>
        <Card className="p-6 text-center shadow">
          <h2 className="text-lg font-semibold">Bookings</h2>
          <p className="text-3xl font-bold text-indigo-600">{stats.bookings}</p>
        </Card>
        <Card className="p-6 text-center shadow">
          <h2 className="text-lg font-semibold">Payments</h2>
          <p className="text-3xl font-bold text-purple-600">{stats.payments}</p>
        </Card>
        <Card className="p-6 text-center shadow col-span-full md:col-span-2 lg:col-span-1">
          <h2 className="text-lg font-semibold">Revenue</h2>
          <p className="text-3xl font-bold text-emerald-600">
            ₹{stats.revenue.toLocaleString()}
          </p>
        </Card>
      </section>

      {/* Revenue Chart */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Monthly Revenue Trend
        </h2>
        {chartData.length === 0 ? (
          <p className="text-gray-500 text-sm">No payments yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Listings */}
        <Card className="p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Listings</h2>
          {recentListings.length === 0 ? (
            <p className="text-gray-500 text-sm">No listings yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentListings.map((l) => (
                <li key={l.id} className="py-2 flex justify-between text-sm">
                  <span>{l.name}</span>
                  <span
                    className={`font-semibold ${
                      l.status === "approved"
                        ? "text-green-600"
                        : l.status === "pending"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {l.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Bookings */}
        <Card className="p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
          {recentBookings.length === 0 ? (
            <p className="text-gray-500 text-sm">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentBookings.map((b) => (
                <li key={b.id} className="py-2 flex justify-between text-sm">
                  <span>Listing: {b.listingId}</span>
                  <span>₹{b.totalPrice}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Payments */}
        <Card className="p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
          {recentPayments.length === 0 ? (
            <p className="text-gray-500 text-sm">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentPayments.map((p) => (
                <li key={p.id} className="py-2 flex justify-between text-sm">
                  <span>
                    {p.status === "success" ? "✅ Success" : "❌ Failed"}
                  </span>
                  <span>₹{p.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="text-center pt-8">
        {isAdmin ? (
          <Link href="/dashboard/listings">
            <Button className="bg-blue-600 text-white">Manage Listings</Button>
          </Link>
        ) : (
          <Link href="/dashboard/listings">
            <Button className="bg-green-600 text-white">
              Add / Edit Your Listings
            </Button>
          </Link>
        )}
      </section>
    </div>
  );
}

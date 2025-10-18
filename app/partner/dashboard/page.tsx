"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
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
import PartnerListingsManager from "@/components/dashboard/PartnerListingsManager";

interface Booking {
  id: string;
  userName?: string;
  customerName?: string;
  date?: string;
  amount?: number;
  createdAt?: any;
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ listings: 0, bookings: 0, earnings: 0 });
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    let unsubListings: any = null;
    let unsubBookings: any = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists() || userSnap.data()?.role !== "partner") {
          alert("❌ Not authorized");
          router.push("/");
          return;
        }

        const userData = userSnap.data();
        setProfile(userData);
        const uid = user.uid;

        // === LISTINGS ===
        const listingsQuery = query(
          collection(db, "listings"),
          where("createdBy", "==", uid)
        );
        unsubListings = onSnapshot(
          listingsQuery,
          (snap) => setStats((prev) => ({ ...prev, listings: snap.size })),
          (err) => console.error("🔥 Listings snapshot error:", err)
        );

        // === BOOKINGS ===
        try {
          const bookingsQuery = query(
            collection(db, "bookings"),
            where("partnerId", "==", uid),
            orderBy("createdAt", "desc")
          );
          unsubBookings = onSnapshot(
            bookingsQuery,
            (snap) => {
              const bookings = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Booking),
              }));

              const total = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
              setStats((prev) => ({
                ...prev,
                bookings: bookings.length,
                earnings: total,
              }));

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

              setChartData(last7Days);
              setLoading(false);
            },
            (err) => {
              console.error("🔥 Bookings snapshot error:", err);
              setLoading(false);
            }
          );
        } catch (err) {
          console.warn("⚠️ Fallback to bookings without createdAt:", err);
          const fallbackQuery = query(
            collection(db, "bookings"),
            where("partnerId", "==", uid)
          );
          unsubBookings = onSnapshot(fallbackQuery, (snap) => {
            const bookings = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Booking),
            }));
            const total = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
            setStats((prev) => ({
              ...prev,
              bookings: bookings.length,
              earnings: total,
            }));
            setLoading(false);
          });
        }
      } catch (err) {
        console.error("🔥 PartnerDashboard init error:", err);
        setLoading(false);
      }
    });

    return () => {
      if (unsubListings) unsubListings();
      if (unsubBookings) unsubBookings();
      unsubscribeAuth();
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
      {/* === STATS === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* === BOOKINGS CHART === */}
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

      {/* === MANAGE LISTINGS === */}
      <section className="bg-white shadow rounded-2xl p-6 mb-12">
        <h3 className="text-xl font-semibold mb-6">Manage Your Listings</h3>
        <PartnerListingsManager />
      </section>
    </DashboardLayout>
  );
}

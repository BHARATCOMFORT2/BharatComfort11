"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const partnersSnap = await getDocs(collection(db, "partners"));
      const listingsSnap = await getDocs(collection(db, "listings"));
      const paymentsSnap = await getDocs(collection(db, "payments"));

      const totalRevenue = paymentsSnap.docs.reduce((sum, doc) => {
        const data = doc.data();
        return data.status === "success" ? sum + (data.amount || 0) : sum;
      }, 0);

      setStats({
        users: usersSnap.size,
        partners: partnersSnap.size,
        listings: listingsSnap.size,
        payments: paymentsSnap.size,
        revenue: totalRevenue,
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    // TODO: enforce superadmin role check
    fetchStats();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading analytics...</p>;
  if (!stats) return <p className="text-center py-12">No data available</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">Platform Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Users" value={stats.users} />
        <StatCard title="Total Partners" value={stats.partners} />
        <StatCard title="Listings" value={stats.listings} />
        <StatCard title="Payments" value={stats.payments} />
        <StatCard
          title="Revenue"
          value={`₹${stats.revenue.toLocaleString("en-IN")}`}
        />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <h2 className="text-gray-600 text-sm">{title}</h2>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>({
    users: 0,
    partners: 0,
    listings: 0,
    staffs: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [usersSnap, partnersSnap, listingsSnap, staffsSnap] =
        await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "partners")),
          getDocs(collection(db, "listings")),
          getDocs(collection(db, "staffs")),
        ]);

      setStats({
        users: usersSnap.size,
        partners: partnersSnap.size,
        listings: listingsSnap.size,
        staffs: staffsSnap.size,
      });
    } catch (err) {
      console.error("Error fetching admin stats:", err);
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
    // TODO: Add check if user is superadmin
    fetchStats();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="p-6 bg-white shadow rounded-lg text-center">
          <h2 className="text-2xl font-bold">{stats.users}</h2>
          <p className="text-gray-600">Users</p>
        </div>
        <div className="p-6 bg-white shadow rounded-lg text-center">
          <h2 className="text-2xl font-bold">{stats.partners}</h2>
          <p className="text-gray-600">Partners</p>
        </div>
        <div className="p-6 bg-white shadow rounded-lg text-center">
          <h2 className="text-2xl font-bold">{stats.listings}</h2>
          <p className="text-gray-600">Listings</p>
        </div>
        <div className="p-6 bg-white shadow rounded-lg text-center">
          <h2 className="text-2xl font-bold">{stats.staffs}</h2>
          <p className="text-gray-600">Staffs</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-4 border rounded-lg bg-white shadow">
          <h3 className="font-semibold mb-2">Manage Listings</h3>
          <button
            onClick={() => router.push("/admin/listings")}
            className="text-blue-600 hover:underline text-sm"
          >
            View Listings
          </button>
        </div>

        <div className="p-4 border rounded-lg bg-white shadow">
          <h3 className="font-semibold mb-2">Manage Partners</h3>
          <button
            onClick={() => router.push("/admin/partners")}
            className="text-blue-600 hover:underline text-sm"
          >
            View Partners
          </button>
        </div>

        <div className="p-4 border rounded-lg bg-white shadow">
          <h3 className="font-semibold mb-2">Manage Staff</h3>
          <button
            onClick={() => router.push("/staffs/users")}
            className="text-blue-600 hover:underline text-sm"
          >
            View Staffs
          </button>
        </div>

        <div className="p-4 border rounded-lg bg-white shadow">
          <h3 className="font-semibold mb-2">Analytics</h3>
          <button
            onClick={() => router.push("/admin/analytics")}
            className="text-blue-600 hover:underline text-sm"
          >
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
}

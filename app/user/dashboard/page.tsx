"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Booking {
  id: string;
  partnerName?: string;
  date: string;
  amount?: number;
}

export default function UserDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ bookings: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return router.push("/auth/login");

        // Verify user role
        const usersSnap = await getDocs(collection(db, "users"));
        const currentUser = usersSnap.docs.find(d => d.id === user.uid);
        if (!currentUser || currentUser.data().role !== "user") {
          alert("❌ Not authorized");
          return router.push("/");
        }

        // Fetch user bookings
        const bookingsSnap = await getDocs(
          query(collection(db, "bookings"), where("userId", "==", user.uid))
        );

        const allBookings: Booking[] = bookingsSnap.docs
          .map(d => ({ id: d.id, ...(d.data() as Partial<Booking>) }))
          .filter((b): b is Booking => !!b.date)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalSpent = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

        setStats({
          bookings: allBookings.length,
          spent: totalSpent,
        });

        setRecentBookings(allBookings.slice(0, 10));
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <header className="flex justify-between mb-8">
        <h1 className="text-2xl font-bold">User Dashboard</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => auth.signOut().then(() => router.push("/auth/login"))}
        >
          Logout
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        <div className="p-6 bg-white shadow rounded-2xl text-center">
          <h2 className="text-2xl font-bold">{stats.bookings}</h2>
          <p className="text-gray-600">Bookings</p>
        </div>
        <div className="p-6 bg-white shadow rounded-2xl text-center">
          <h2 className="text-2xl font-bold">₹{stats.spent}</h2>
          <p className="text-gray-600">Total Spent</p>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-white shadow rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 && <p>No bookings yet.</p>}
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {recentBookings.map(b => (
            <li key={b.id} className="border rounded-lg p-3 flex justify-between">
              <span>{b.partnerName || "Partner"}</span>
              <span className="text-gray-500 text-sm">
                {new Date(b.date).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

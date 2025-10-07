"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface Booking {
  id: string;
  listingName?: string;
  date: string;
  amount?: number;
}

export default function UserDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ bookings: 0, upcoming: 0, spent: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/auth/login");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "user") {
        alert("❌ Not authorized");
        return router.push("/");
      }

      setProfile(userDoc.data());

      const bookingsSnap = await getDocs(query(collection(db, "bookings"), where("userId", "==", user.uid)));

      const totalSpent = bookingsSnap.docs.reduce((sum, b) => sum + (b.data().amount || 0), 0);
      const upcoming = bookingsSnap.docs.filter((b) => new Date(b.data().date) > new Date()).length;

      setStats({
        bookings: bookingsSnap.size,
        upcoming,
        spent: totalSpent,
      });

      const recent: Booking[] = bookingsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Partial<Booking>) }))
        .filter((b): b is Booking => !!b.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentBookings(recent);
      setLoading(false);
    };

    init();
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <DashboardLayout
      title="User Dashboard"
      profile={{
        name: profile?.name,
        role: "user",
        profilePic: profile?.profilePic,
      }}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white shadow rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 && <p>No bookings yet.</p>}
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {recentBookings.map((b, idx) => (
            <li key={idx} className="border rounded-lg p-2 flex justify-between">
              <span>{b.listingName || "Trip"}</span>
              <span className="text-gray-400 text-sm">{new Date(b.date).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}

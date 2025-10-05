"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

interface Stats {
  users: number;
  partners: number;
  listings: number;
  staffs: number;
  bookings: number;
}

interface ActivityItem {
  message: string;
  time: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    users: 0,
    partners: 0,
    listings: 0,
    staffs: 0,
    bookings: 0
  });
  const [pendingPartners, setPendingPartners] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [userName, setUserName] = useState("Superadmin");
  const [loading, setLoading] = useState(true);

  // Group bookings for last 7 days
  const groupBookingsByDate = (bookings: any[]) => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - i);
      return { date: date.toISOString().split("T")[0], count: 0 };
    }).reverse();

    bookings.forEach(b => {
      const date = b.date?.split("T")[0];
      const day = last7Days.find(d => d.date === date);
      if (day) day.count += 1;
    });

    return last7Days;
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return router.push("/auth/login");

    const usersRef = collection(db, "users");
    const partnersRef = collection(db, "partners");
    const listingsRef = collection(db, "listings");
    const staffsRef = collection(db, "staffs");
    const bookingsRef = collection(db, "bookings");

    // Superadmin check + real-time updates
    const unsubscribeUsers = onSnapshot(usersRef, snapshot => {
      const currentUser = snapshot.docs.find(d => d.id === user.uid);
      if (!currentUser) {
        alert("❌ You are not authorized (no user profile).");
        return router.push("/");
      }
      const role = currentUser.data().role;
      if (role !== "superadmin") {
        alert("❌ You are not authorized (role: " + role + ")");
        return router.push("/");
      }

      setUserName(currentUser.data().name || "Superadmin");

      setStats(prev => ({ ...prev, users: snapshot.size }));

      // Recent activity: users
      const userActivity = snapshot.docs.map(d => ({
        message: `User signed up: ${d.data().name || d.data().email}`,
        time: d.data().createdAt || ""
      }));

      setRecentActivity(prev => {
        const partnersActivity = prev.filter(item => item.message.startsWith("Partner"));
        return [...userActivity, ...partnersActivity]
          .sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0,10);
      });
    });

    const unsubscribePartners = onSnapshot(partnersRef, snapshot => {
      setStats(prev => ({ ...prev, partners: snapshot.size }));

      // Pending partners
      const pending = snapshot.docs.filter(d => d.data().status === "pending");
      setPendingPartners(pending.map(d => ({ id: d.id, ...d.data() })));

      // Recent activity: partners
      const partnerActivity = snapshot.docs.map(d => ({
        message: `Partner signed up: ${d.data().name || d.data().email}`,
        time: d.data().createdAt || ""
      }));

      setRecentActivity(prev => {
        const usersActivity = prev.filter(item => item.message.startsWith("User"));
        return [...usersActivity, ...partnerActivity]
          .sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0,10);
      });
    });

    const unsubscribeListings = onSnapshot(listingsRef, snapshot => setStats(prev => ({ ...prev, listings: snapshot.size })));
    const unsubscribeStaffs = onSnapshot(staffsRef, snapshot => setStats(prev => ({ ...prev, staffs: snapshot.size })));
    const unsubscribeBookings = onSnapshot(bookingsRef, snapshot => {
      setStats(prev => ({ ...prev, bookings: snapshot.size }));
    });

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribePartners();
      unsubscribeListings();
      unsubscribeStaffs();
      unsubscribeBookings();
    };
  }, [router]);

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, "partners", id), { status: "approved" });
    alert("✅ Partner approved!");
  };

  const handleReject = async (id: string) => {
    await updateDoc(doc(db, "partners", id), { status: "rejected" });
    alert("❌ Partner rejected!");
  };

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg hidden md:block">
        <div className="p-6 font-bold text-xl border-b">BHARATCOMFORT11</div>
        <nav className="p-6 space-y-4">
          <a href="/admin/dashboard" className="text-blue-600 font-medium hover:underline">Dashboard</a>
          <a href="/admin/users" className="text-gray-700 hover:text-blue-600">Users</a>
          <a href="/admin/partners" className="text-gray-700 hover:text-blue-600">Partners</a>
          <a href="/admin/listings" className="text-gray-700 hover:text-blue-600">Listings</a>
          <a href="/staffs/users" className="text-gray-700 hover:text-blue-600">Staffs</a>
          <a href="/admin/analytics" className="text-gray-700 hover:text-blue-600">Analytics</a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Welcome, {userName}!</h1>
          <button
            onClick={() => auth.signOut().then(() => router.push("/auth/login"))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Logout
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
              <h2 className="text-2xl font-bold">{value}</h2>
              <p className="text-gray-600 capitalize">{key}</p>
            </div>
          ))}
        </div>

        {/* Booking Chart */}
        <div className="bg-white shadow rounded-2xl p-6 mb-12">
          <h3 className="text-lg font-semibold mb-4">Bookings Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[...Array(5)].map((_, i) => ({ name: Object.keys(stats)[i], count: Object.values(stats)[i] }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pending Partner Approvals */}
        <div className="bg-white shadow rounded-2xl p-6 mb-12">
          <h3 className="text-lg font-semibold mb-4">Pending Partner Approvals</h3>
          {pendingPartners.length === 0 && <p>No pending partners.</p>}
          <div className="space-y-4">
            {pendingPartners.map(p => (
              <div key={p.id} className="flex justify-between items-center border rounded-lg p-4">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-gray-500 text-sm">{p.email}</p>
                </div>
                <div className="space-x-2">
                  <button onClick={() => handleApprove(p.id)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                  <button onClick={() => handleReject(p.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {recentActivity.length === 0 && <p>No recent activity.</p>}
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {recentActivity.map((item, i) => (
              <li key={i} className="border rounded-lg p-2 flex justify-between">
                <span>{item.message}</span>
                <span className="text-gray-400 text-sm">{item.time ? new Date(item.time).toLocaleString() : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

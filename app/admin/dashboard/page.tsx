"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc, updateDoc, query, where, onSnapshot } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// Types
interface Stats {
  users: number;
  partners: number;
  listings: number;
  staffs: number;
}

interface PendingPartner {
  id: string;
  name: string;
  email: string;
  status: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ users: 0, partners: 0, listings: 0, staffs: 0 });
  const [pendingPartners, setPendingPartners] = useState<PendingPartner[]>([]);
  const [bookingsData, setBookingsData] = useState<any[]>([]);

  // Group bookings by last 7 days
  const groupBookingsByDate = (bookings: any[]) => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      return { date: key, count: 0 };
    }).reverse();

    bookings.forEach((b) => {
      const date = b.date?.split("T")[0];
      const found = last7Days.find((d) => d.date === date);
      if (found) found.count += 1;
    });
    return last7Days;
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get user profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        alert("⚠️ User profile not found.");
        router.push("/");
        return;
      }

      const userData = userDoc.data();
      if (userData.role !== "admin") {
        alert("❌ You are not authorized.");
        router.push("/");
        return;
      }

      setUserName(userData.name || "Admin");

      try {
        // Fetch stats
        const [usersSnap, partnersSnap, listingsSnap, staffsSnap, bookingsSnap] =
          await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "partners")),
            getDocs(collection(db, "listings")),
            getDocs(collection(db, "staffs")),
            getDocs(collection(db, "bookings")),
          ]);

        setStats({
          users: usersSnap.size,
          partners: partnersSnap.size,
          listings: listingsSnap.size,
          staffs: staffsSnap.size,
        });

        const bookingsArray = bookingsSnap.docs.map((d) => d.data());
        setBookingsData(groupBookingsByDate(bookingsArray));

        // Pending partners listener
        const q = query(collection(db, "partners"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snap) => {
          setPendingPartners(
            snap.docs.map((d) => {
              const data = d.data() as PendingPartner;
              return { id: d.id, name: data.name, email: data.email, status: data.status };
            })
          );
        });

      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
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
          <a href="/staffs/users" className="text-gray-700 hover:text-blue-600">Staffs</a>
          <a href="/admin/partners" className="text-gray-700 hover:text-blue-600">Partners</a>
          <a href="/admin/listings" className="text-gray-700 hover:text-blue-600">Listings</a>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="p-6 bg-white shadow rounded-2xl text-center">
              <h2 className="text-2xl font-bold">{value}</h2>
              <p className="text-gray-600 capitalize">{key}</p>
            </div>
          ))}
        </div>

        {/* Bookings Chart */}
        <div className="bg-white shadow rounded-2xl p-6 mb-12">
          <h3 className="text-lg font-semibold mb-4">Bookings (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bookingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="p-4 border rounded-lg bg-white shadow">
            <h3 className="font-semibold mb-2">Manage Users</h3>
            <button
              onClick={() => router.push("/admin/users")}
              className="text-blue-600 hover:underline text-sm"
            >
              View Users
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
            <h3 className="font-semibold mb-2">Manage Partners</h3>
            <button
              onClick={() => router.push("/admin/partners")}
              className="text-blue-600 hover:underline text-sm"
            >
              View Partners
            </button>
          </div>

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
            <h3 className="font-semibold mb-2">Analytics</h3>
            <button
              onClick={() => router.push("/admin/analytics")}
              className="text-blue-600 hover:underline text-sm"
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Pending Partners */}
        <div className="bg-white shadow rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Pending Partner Approvals</h3>
          {pendingPartners.length === 0 ? (
            <p>No pending partners.</p>
          ) : (
            <div className="space-y-4">
              {pendingPartners.map((p) => (
                <div key={p.id} className="flex justify-between items-center border rounded-lg p-4">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-gray-500 text-sm">{p.email}</p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleApprove(p.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(p.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from "recharts";

interface Stats {
  users: number;
  partners: number;
  listings: number;
  staffs: number;
  bookings?: number;
}

interface ActivityItem {
  message: string;
  time: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ users: 0, partners: 0, listings: 0, staffs: 0, bookings: 0 });
  const [pendingPartners, setPendingPartners] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  // Analytics states
  const [combinedRawData, setCombinedRawData] = useState<any[]>([]);
  const [analyticsChartData, setAnalyticsChartData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(getLast7Days()[0]);
  const [endDate, setEndDate] = useState(getLast7Days()[6]);

  // Helper: last 7 days array
  function getLast7Days() {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();
  }

  // Group bookings/users/partners/etc by date
  const groupByDate = (bookings: any[], users: any[], partners: any[], listings: any[], staffs: any[]) => {
    const today = new Date();
    const last7Days = getLast7Days().map(d => ({
      date: d,
      users: 0,
      partners: 0,
      listings: 0,
      staffs: 0,
      bookings: 0
    }));

    bookings.forEach(b => {
      const d = b.date?.split("T")[0];
      const day = last7Days.find(ld => ld.date === d);
      if (day) day.bookings += 1;
    });

    users.forEach(u => {
      const d = u.data().createdAt?.split("T")[0];
      const day = last7Days.find(ld => ld.date === d);
      if (day) day.users += 1;
    });

    partners.forEach(p => {
      const d = p.data().createdAt?.split("T")[0];
      const day = last7Days.find(ld => ld.date === d);
      if (day) day.partners += 1;
    });

    listings.forEach(l => {
      const d = l.data().createdAt?.split("T")[0];
      const day = last7Days.find(ld => ld.date === d);
      if (day) day.listings += 1;
    });

    staffs.forEach(s => {
      const d = s.data().createdAt?.split("T")[0];
      const day = last7Days.find(ld => ld.date === d);
      if (day) day.staffs += 1;
    });

    return last7Days;
  };

  // Fetch dashboard data
  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/auth/login");

      // Check superadmin
      const usersSnap = await getDocs(collection(db, "users"));
      const currentUser = usersSnap.docs.find(d => d.id === user.uid);
      if (!currentUser || currentUser.data().role !== "superadmin") {
        alert("❌ You are not authorized.");
        return router.push("/");
      }
      setUserName(currentUser.data().name || "Superadmin");

      const [usersSnap2, partnersSnap, listingsSnap, staffsSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "partners")),
        getDocs(collection(db, "listings")),
        getDocs(collection(db, "staffs")),
        getDocs(collection(db, "bookings"))
      ]);

      setStats({
        users: usersSnap2.size,
        partners: partnersSnap.size,
        listings: listingsSnap.size,
        staffs: staffsSnap.size,
        bookings: bookingsSnap.size
      });

      const combinedData = groupByDate(
        bookingsSnap.docs.map(d => d.data()),
        usersSnap2.docs,
        partnersSnap.docs,
        listingsSnap.docs,
        staffsSnap.docs
      );

      setCombinedRawData(combinedData);
      setAnalyticsChartData(combinedData);

      // Recent activity
      const recent = [
        ...usersSnap2.docs.map(d => ({ message: `User signed up: ${d.data().name}`, time: d.data().createdAt || "" })),
        ...partnersSnap.docs.map(d => ({ message: `Partner signed up: ${d.data().name}`, time: d.data().createdAt || "" }))
      ].sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0,10);

      setRecentActivity(recent);

      // Pending partners listener
      const q = query(collection(db, "partners"), where("status", "==", "pending"));
      const unsubscribe = onSnapshot(q, snapshot => {
        setPendingPartners(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      setLoading(false);
      return unsubscribe;
    };

    init();
  }, [router]);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, "partners", id), { status: "approved" });
    alert("✅ Partner approved!");
  };

  const handleReject = async (id: string) => {
    await updateDoc(doc(db, "partners", id), { status: "rejected" });
    alert("❌ Partner rejected!");
  };

  const filterAnalyticsData = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filtered = combinedRawData.filter(item => {
      const d = new Date(item.date);
      return d >= start && d <= end;
    });
    setAnalyticsChartData(filtered);
  };

  const getTotalsForRange = () => {
    const totals = { users: 0, partners: 0, listings: 0, staffs: 0, bookings: 0 };
    analyticsChartData.forEach(item => {
      totals.users += item.users || 0;
      totals.partners += item.partners || 0;
      totals.listings += item.listings || 0;
      totals.staffs += item.staffs || 0;
      totals.bookings += item.bookings || 0;
    });
    return totals;
  };

  const handleLineClick = (dataKey: string) => {
    const total = analyticsChartData.reduce((acc, item) => acc + (item[dataKey] || 0), 0);
    alert(`Total ${dataKey.charAt(0).toUpperCase() + dataKey.slice(1)} in selected range: ${total}`);
  };

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  const totals = getTotalsForRange();

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

      {/* Main */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Object.entries(totals).map(([key, value]) => (
            <div key={key} className="p-4 bg-white shadow rounded-2xl text-center">
              <h2 className="text-2xl font-bold">{value}</h2>
              <p className="text-gray-600 capitalize">{key}</p>
            </div>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-4 mb-4">
          <label className="font-medium">Start Date:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1" />
          <label className="font-medium">End Date:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1" />
          <button onClick={filterAnalyticsData} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
        </div>

        {/* Analytics Chart */}
        <div className="bg-white shadow rounded-2xl p-6 mb-12">
          <h3 className="text-lg font-semibold mb-4">Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #ccc" }} />
              <Legend verticalAlign="top" wrapperStyle={{ cursor: "pointer" }} onClick={(e: any) => handleLineClick(e.dataKey)} />
              <Line type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 8, onClick: () => handleLineClick("users") }} />
              <Line type="monotone" dataKey="partners" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8, onClick: () => handleLineClick("partners") }} />
              <Line type="monotone" dataKey="listings" stroke="#f59e0b" strokeWidth={2} activeDot={{ r: 8, onClick: () => handleLineClick("listings") }} />
              <Line type="monotone" dataKey="staffs" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 8, onClick: () => handleLineClick("staffs") }} />
              <Line type="monotone" dataKey="bookings" stroke="#8b5cf6" strokeWidth={2} activeDot={{ r: 8, onClick: () => handleLineClick("bookings") }} />
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

        {/* Recent Activity Feed */}
        <div className="bg-white shadow rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {recentActivity.length === 0 && <p>No recent activity.</p>}
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {recentActivity.map((item, index) => (
              <li key={index} className="border rounded-lg p-2 flex justify-between">
                <span>{item.message}</span>
                <span className="text-gray-400 text-sm">{new Date(item.time).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

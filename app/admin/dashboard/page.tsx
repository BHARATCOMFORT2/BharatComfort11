"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Dashboard,
  Users,
  Briefcase,
  ClipboardList,
  BarChart2,
  Bell,
  UserCircle,
  Menu,
  X,
  Search,
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [stats, setStats] = useState<Stats>({ users: 0, partners: 0, listings: 0, staffs: 0 });
  const [pendingPartners, setPendingPartners] = useState<PendingPartner[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [userName, setUserName] = useState("");

  const groupBookingsByDate = (bookings: any[]) => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return { date: d.toISOString().split("T")[0], count: 0 };
    }).reverse();

    bookings.forEach((b) => {
      const date = b.date?.split("T")[0];
      const day = last7Days.find((d) => d.date === date);
      if (day) day.count += 1;
    });

    return last7Days;
  };

  useEffect(() => {
    const initDashboard = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/auth/login");

      const usersRef = collection(db, "users");
      const unsubUser = onSnapshot(usersRef, (snap) => {
        const currentUser = snap.docs.find((d) => d.id === user.uid)?.data();
        if (!currentUser || currentUser.role !== "admin") {
          alert("❌ Not authorized");
          router.push("/");
          return;
        }
        setUserName(currentUser.name || "Admin");
      });

      // Stats
      const unsubUsers = onSnapshot(collection(db, "users"), (snap) =>
        setStats((prev) => ({ ...prev, users: snap.size }))
      );
      const unsubPartners = onSnapshot(collection(db, "partners"), (snap) =>
        setStats((prev) => ({ ...prev, partners: snap.size }))
      );
      const unsubListings = onSnapshot(collection(db, "listings"), (snap) =>
        setStats((prev) => ({ ...prev, listings: snap.size }))
      );
      const unsubStaffs = onSnapshot(collection(db, "staffs"), (snap) =>
        setStats((prev) => ({ ...prev, staffs: snap.size }))
      );

      // Pending partners
      const pendingQ = query(collection(db, "partners"), where("status", "==", "pending"));
      const unsubPending = onSnapshot(pendingQ, (snap) =>
        setPendingPartners(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
      );

      // Bookings chart
      const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
        const bookingsData = snap.docs.map((d) => d.data());
        setChartData(groupBookingsByDate(bookingsData));
      });

      setLoading(false);

      return () => {
        unsubUser();
        unsubUsers();
        unsubPartners();
        unsubListings();
        unsubStaffs();
        unsubPending();
        unsubBookings();
      };
    };

    initDashboard();
  }, [router]);

  const handleApprove = async (id: string) => {
    await db.collection("partners").doc(id).update({ status: "approved" });
    alert("✅ Partner approved!");
  };

  const handleReject = async (id: string) => {
    await db.collection("partners").doc(id).update({ status: "rejected" });
    alert("❌ Partner rejected!");
  };

  if (loading) return <p className="text-center py-12 text-gray-500">Loading dashboard...</p>;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed z-30 inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static w-64 bg-white shadow-lg transition-transform duration-300`}
      >
        <div className="flex justify-between items-center p-6 border-b">
          <span className="text-xl font-bold text-blue-600">BHARATCOMFORT11</span>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X />
          </button>
        </div>
        <nav className="mt-6">
          {[
            { name: "Dashboard", href: "/admin/dashboard", icon: <Dashboard /> },
            { name: "Users", href: "/admin/users", icon: <Users /> },
            { name: "Partners", href: "/admin/partners", icon: <Briefcase /> },
            { name: "Listings", href: "/admin/listings", icon: <ClipboardList /> },
            { name: "Staffs", href: "/staffs/users", icon: <Users /> },
            { name: "Analytics", href: "/admin/analytics", icon: <BarChart2 /> },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 p-4 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              {item.icon}
              <span>{item.name}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Top Navbar */}
        <div className="flex justify-between items-center p-6 bg-white shadow">
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu />
            </button>
            <Search className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="px-3 py-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <Bell className="text-gray-600 cursor-pointer" />
            <div className="flex items-center gap-2 cursor-pointer">
              <UserCircle className="text-gray-600" />
              <span className="text-gray-700 font-medium">{userName}</span>
              <button
                onClick={() => auth.signOut().then(() => router.push("/auth/login"))}
                className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 flex-1 overflow-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {Object.entries(stats).map(([key, value]) => (
              <div
                key={key}
                className="p-6 bg-white shadow-lg rounded-2xl text-center transform hover:scale-105 transition"
              >
                <h2 className="text-3xl font-bold text-gray-800">{value}</h2>
                <p className="text-gray-500 capitalize">{key}</p>
              </div>
            ))}
          </div>

          {/* Bookings Chart */}
          <div className="bg-white shadow-lg rounded-2xl p-6 mb-12">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Bookings (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#4B5563" />
                <YAxis stroke="#4B5563" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pending Partners */}
          <div className="bg-white shadow-lg rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Pending Partner Approvals</h3>
            {pendingPartners.length === 0 ? (
              <p className="text-gray-500">No pending partners.</p>
            ) : (
              <div className="space-y-4">
                {pendingPartners.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <p className="text-gray-500 text-sm">{p.email}</p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleApprove(p.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(p.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
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
    </div>
  );
}

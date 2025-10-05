"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { Home, Users, Briefcase, ClipboardList, BarChart2 } from "lucide-react";

interface PendingPartner {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Listing {
  id: string;
  title: string;
  ownerId: string;
  status: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  const [stats, setStats] = useState({
    users: 0,
    partners: 0,
    listings: 0,
    staffs: 0,
  });

  const [pendingPartners, setPendingPartners] = useState<PendingPartner[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);

  // -------------------- HELPERS --------------------
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

  const handleApprovePartner = async (id: string) => {
    await updateDoc(doc(db, "partners", id), { status: "approved" });
    alert("✅ Partner approved!");
  };

  const handleRejectPartner = async (id: string) => {
    await updateDoc(doc(db, "partners", id), { status: "rejected" });
    alert("❌ Partner rejected!");
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (confirm("Are you sure you want to delete this?")) {
      await deleteDoc(doc(db, collectionName, id));
      alert("✅ Deleted successfully!");
    }
  };

  // -------------------- LOAD DASHBOARD --------------------
  useEffect(() => {
    const loadDashboard = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        alert("⚠️ No user profile found in Firestore.");
        router.push("/");
        return;
      }

      const userData = docSnap.data();
      if (userData.role !== "admin") {
        alert("❌ You are not authorized to access this page.");
        router.push("/");
        return;
      }
      setUserName(userData.name || "Admin");

      try {
        // Fetch stats & data
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

        setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
        setListings(listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing)));
        setStaffs(staffsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Staff)));

        const bookingsData = bookingsSnap.docs.map((d) => d.data());
        setChartData(groupBookingsByDate(bookingsData));

        // Pending partners real-time
        const q = query(collection(db, "partners"), where("status", "==", "pending"));
        const unsub = onSnapshot(q, (snap) => {
          setPendingPartners(
            snap.docs.map((d) => {
              const data = d.data() as Omit<PendingPartner, "id">;
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

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  // -------------------- RENDER --------------------
  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg hidden md:block">
        <div className="p-6 font-bold text-xl border-b">BHARATCOMFORT11</div>
        <nav className="p-6 space-y-4">
          {[
            { name: "Dashboard", href: "/admin/dashboard", icon: <Home /> },
            { name: "Users", href: "#users", icon: <Users /> },
            { name: "Partners", href: "#partners", icon: <Briefcase /> },
            { name: "Listings", href: "#listings", icon: <ClipboardList /> },
            { name: "Staffs", href: "#staffs", icon: <Users /> },
            { name: "Analytics", href: "#analytics", icon: <BarChart2 /> },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 p-4 hover:bg-blue-50 hover:text-blue-600 transition"
            >
              {item.icon} <span>{item.name}</span>
            </a>
          ))}
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
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Users Section */}
        <section id="users" className="mb-12">
          <h3 className="text-lg font-semibold mb-4">Users</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4">Name</th>
                  <th className="py-2 px-4">Email</th>
                  <th className="py-2 px-4">Role</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{u.name}</td>
                    <td className="py-2 px-4">{u.email}</td>
                    <td className="py-2 px-4">{u.role}</td>
                    <td className="py-2 px-4">
                      <button
                        onClick={() => handleDelete("users", u.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Partners Section */}
        <section id="partners" className="mb-12">
          <h3 className="text-lg font-semibold mb-4">Partners</h3>
          {pendingPartners.length === 0 ? (
            <p>No pending partners.</p>
          ) : (
            <div className="space-y-4">
              {pendingPartners.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center border rounded-lg p-4 bg-white shadow"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-gray-500 text-sm">{p.email}</p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleApprovePartner(p.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectPartner(p.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Listings Section */}
        <section id="listings" className="mb-12">
          <h3 className="text-lg font-semibold mb-4">Listings</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4">Title</th>
                  <th className="py-2 px-4">Owner ID</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{l.title}</td>
                    <td className="py-2 px-4">{l.ownerId}</td>
                    <td className="py-2 px-4">{l.status}</td>
                    <td className="py-2 px-4">
                      <button
                        onClick={() => handleDelete("listings", l.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Staffs Section */}
        <section id="staffs" className="mb-12">
          <h3 className="text-lg font-semibold mb-4">Staffs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4">Name</th>
                  <th className="py-2 px-4">Email</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffs.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{s.name}</td>
                    <td className="py-2 px-4">{s.email}</td>
                    <td className="py-2 px-4">
                      <button
                        onClick={() => handleDelete("staffs", s.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

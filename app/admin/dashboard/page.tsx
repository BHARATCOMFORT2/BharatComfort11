"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Listing } from "@/components/listings/ListingCard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
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
  status?: string;
}

interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

interface Listing {
  id: string;
  title?: string;
  partnerId?: string;
  approvalStatus?: string;
  rejectionReason?: string;
  city?: string;
}

interface Staff {
  id: string;
  name?: string;
  email?: string;
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
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>(
    []
  );
  const [rejectionInputs, setRejectionInputs] = useState<Record<string, string>>(
    {}
  ); // per-listing rejection reason

  // Helper: group bookings by last 7 days
  const groupBookingsByDate = (bookings: any[]) => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return { date: d.toISOString().split("T")[0], count: 0 };
    }).reverse();

    bookings.forEach((b) => {
      const date = b.date?.split?.("T")?.[0];
      const found = last7Days.find((d) => d.date === date);
      if (found) found.count += 1;
    });

    return last7Days;
  };

  // Approve / Reject Partner
  const handleApprovePartner = async (id: string) => {
    try {
      await updateDoc(doc(db, "partners", id), {
        status: "approved",
        approvedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("approve partner error:", err);
      alert("Failed to approve partner.");
    }
  };
  const handleRejectPartner = async (id: string) => {
    try {
      await updateDoc(doc(db, "partners", id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("reject partner error:", err);
      alert("Failed to reject partner.");
    }
  };

  // Approve / Reject Listing (with optional reason)
  const handleApproveListing = async (id: string) => {
    try {
      await updateDoc(doc(db, "listings", id), {
        approved: true,
        approvalStatus: "approved",
        approvedAt: serverTimestamp(),
        rejectionReason: null,
      });
    } catch (err) {
      console.error("approve listing error:", err);
      alert("Failed to approve listing.");
    }
  };

  const handleRejectListing = async (id: string) => {
    try {
      const reason = rejectionInputs[id] || "No reason provided";
      await updateDoc(doc(db, "listings", id), {
        approved: false,
        approvalStatus: "rejected",
        rejectedAt: serverTimestamp(),
        rejectionReason: reason,
      });
      // clear input
      setRejectionInputs((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      console.error("reject listing error:", err);
      alert("Failed to reject listing.");
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm("Are you sure? This action is irreversible.")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      console.error("delete error:", err);
      alert("Failed to delete.");
    }
  };

  useEffect(() => {
    let unsubscribers: (() => void)[] = [];

    const loadDashboard = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        router.push("/");
        return;
      }

      const userData = docSnap.data();
      if (userData.role !== "admin") {
        alert("❌ Not authorized");
        router.push("/");
        return;
      }

      setUserName(userData.name || "Admin");

      try {
        // Real-time: Users
        const usersUnsub = onSnapshot(collection(db, "users"), (snap) => {
          const usersData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setUsers(usersData);
          setStats((s) => ({ ...s, users: usersData.length }));
        });
        unsubscribers.push(usersUnsub);

        // Real-time: Partners (all) & Pending partners (filtered)
        const partnersUnsub = onSnapshot(collection(db, "partners"), (snap) => {
          const partnersData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setStats((s) => ({ ...s, partners: partnersData.length }));
        });
        unsubscribers.push(partnersUnsub);

        const pendingQ = query(collection(db, "partners"), where("status", "==", "pending"));
        const pendingUnsub = onSnapshot(pendingQ, (snap) => {
          setPendingPartners(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
          );
        });
        unsubscribers.push(pendingUnsub);

        // Real-time: Listings
        const listingsUnsub = onSnapshot(collection(db, "listings"), (snap) => {
          const listingsData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setListings(listingsData);
          setStats((s) => ({ ...s, listings: listingsData.length }));
        });
        unsubscribers.push(listingsUnsub);

        // Real-time: Staffs
        const staffsUnsub = onSnapshot(collection(db, "staffs"), (snap) => {
          const staffsData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setStaffs(staffsData);
          setStats((s) => ({ ...s, staffs: staffsData.length }));
        });
        unsubscribers.push(staffsUnsub);

        // Real-time: Bookings -> chart
        const bookingsUnsub = onSnapshot(collection(db, "bookings"), (snap) => {
          const bookingsData = snap.docs.map((d) => d.data());
          setChartData(groupBookingsByDate(bookingsData));
        });
        unsubscribers.push(bookingsUnsub);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      unsubscribers.forEach((u) => u());
      unsubscribers = [];
    };
  }, [router]);

  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg hidden md:block">
        <div className="p-6 font-bold text-xl border-b">BHARATCOMFORT11</div>
        <nav className="p-6 space-y-2">
          {[
            { name: "Dashboard", href: "#dashboard", icon: <Home /> },
            { name: "Users", href: "#users", icon: <Users /> },
            { name: "Partners", href: "#partners", icon: <Briefcase /> },
            { name: "Listings", href: "#listings", icon: <ClipboardList /> },
            { name: "Staffs", href: "#staffs", icon: <Users /> },
            { name: "Analytics", href: "#analytics", icon: <BarChart2 /> },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 p-3 hover:bg-blue-50 hover:text-blue-600 rounded"
            >
              {item.icon}
              <span>{item.name}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Welcome, {userName}!</h1>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => auth.signOut().then(() => router.push("/auth/login"))}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {Object.entries(stats).map(([key, value]) => (
            <div
              key={key}
              className="p-6 bg-white shadow rounded-lg text-center hover:shadow-lg transition"
            >
              <h2 className="text-2xl font-bold">{value}</h2>
              <p className="text-gray-600 capitalize">{key}</p>
            </div>
          ))}
        </div>

        {/* Bookings Chart */}
        <section id="analytics" className="bg-white p-6 shadow rounded-lg mb-12">
          <h3 className="font-semibold mb-4">Bookings (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Users Table */}
        <section id="users" className="mb-12">
          <h3 className="font-semibold mb-4">Users</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow rounded-lg">
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

        {/* Pending Partners */}
        <section id="partners" className="mb-12">
          <h3 className="font-semibold mb-4">Pending Partners</h3>
          {pendingPartners.length === 0 ? (
            <p>No pending partners.</p>
          ) : (
            <div className="space-y-4">
              {pendingPartners.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-4 bg-white shadow rounded-lg">
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
                    <button
                      onClick={() => handleDelete("partners", p.id)}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Listings Table (with approve/reject) */}
        <section id="listings" className="mb-12">
          <h3 className="font-semibold mb-4">Listings</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4">Title</th>
                  <th className="py-2 px-4">Owner ID</th>
                  <th className="py-2 px-4">City</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{l.title}</td>
                    <td className="py-2 px-4 text-sm">{l.partnerId || l.ownerId}</td>
                    <td className="py-2 px-4">{l.city}</td>
                    <td className="py-2 px-4">
                      <span className={`font-medium ${
                        l.approvalStatus === "approved"
                          ? "text-green-600"
                          : l.approvalStatus === "rejected"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}>
                        {l.approvalStatus || (l.approved ? "approved" : "pending")}
                      </span>
                      {l.approvalStatus === "rejected" && (
                        <div className="text-sm text-red-500 mt-1">
                          {l.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <button
                          onClick={() => handleApproveListing(l.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Approve
                        </button>

                        <input
                          placeholder="Rejection reason"
                          value={rejectionInputs[l.id] || ""}
                          onChange={(e) =>
                            setRejectionInputs((prev) => ({ ...prev, [l.id]: e.target.value }))
                          }
                          className="border p-1 rounded text-sm"
                        />

                        <button
                          onClick={() => handleRejectListing(l.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => handleDelete("listings", l.id)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Staff Table */}
        <section id="staffs" className="mb-12">
          <h3 className="font-semibold mb-4">Staffs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow rounded-lg">
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
      </main>
    </div>
  );
}

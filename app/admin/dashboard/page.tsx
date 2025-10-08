"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
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

import {
  Home,
  Users,
  Briefcase,
  ClipboardList,
  BarChart2,
} from "lucide-react";

// ---------- INTERFACES ----------
interface Partner {
  id: string;
  name?: string;
  email?: string;
  status?: "pending" | "approved" | "rejected";
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
  ownerId?: string;
  city?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
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
  const [pendingPartners, setPendingPartners] = useState<Partner[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
  const [rejectionInputs, setRejectionInputs] = useState<Record<string, string>>({});

  // ---------- HELPERS ----------
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

  // ---------- ACTION HANDLERS ----------
  const handleApprovePartner = async (id: string) => {
    await updateDoc(doc(db, "partners", id), {
      status: "approved",
      approvedAt: serverTimestamp(),
    });
  };

  const handleRejectPartner = async (id: string) => {
    await updateDoc(doc(db, "partners", id), {
      status: "rejected",
      rejectedAt: serverTimestamp(),
    });
  };

  const handleApproveListing = async (id: string) => {
    await updateDoc(doc(db, "listings", id), {
      approvalStatus: "approved",
      approvedAt: serverTimestamp(),
      rejectionReason: null,
    });
  };

  const handleRejectListing = async (id: string) => {
    const reason = rejectionInputs[id] || "No reason provided";
    await updateDoc(doc(db, "listings", id), {
      approvalStatus: "rejected",
      rejectedAt: serverTimestamp(),
      rejectionReason: reason,
    });
    setRejectionInputs((prev) => ({ ...prev, [id]: "" }));
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    await deleteDoc(doc(db, collectionName, id));
  };

  // ---------- LOAD DATA ----------
  useEffect(() => {
    let unsubscribers: (() => void)[] = [];

    const init = async () => {
      const user = auth.currentUser;
      if (!user) return router.push("/auth/login");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        alert("❌ Not authorized");
        return router.push("/");
      }

      setUserName(userDoc.data().name || "Admin");

      // Real-time users
      unsubscribers.push(
        onSnapshot(collection(db, "users"), (snap) => {
          const usersData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setUsers(usersData);
          setStats((s) => ({ ...s, users: usersData.length }));
        })
      );

      // Real-time partners
      unsubscribers.push(
        onSnapshot(collection(db, "partners"), (snap) => {
          const partners = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setStats((s) => ({ ...s, partners: partners.length }));
        })
      );

      // Real-time pending partners
      unsubscribers.push(
        onSnapshot(query(collection(db, "partners"), where("status", "==", "pending")), (snap) => {
          setPendingPartners(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        })
      );

      // Real-time listings
      unsubscribers.push(
        onSnapshot(collection(db, "listings"), (snap) => {
          const listingsData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setListings(listingsData);
          setStats((s) => ({ ...s, listings: listingsData.length }));
        })
      );

      // Real-time staffs
      unsubscribers.push(
        onSnapshot(collection(db, "staffs"), (snap) => {
          const staffsData = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setStaffs(staffsData);
          setStats((s) => ({ ...s, staffs: staffsData.length }));
        })
      );

      // Real-time bookings for chart
      unsubscribers.push(
        onSnapshot(collection(db, "bookings"), (snap) => {
          const bookingsData = snap.docs.map((d) => d.data());
          setChartData(groupBookingsByDate(bookingsData));
        })
      );

      setLoading(false);
    };

    init();
    return () => unsubscribers.forEach((u) => u());
  }, [router]);

  // ---------- RENDER ----------
  if (loading) return <p className="text-center py-12">Loading dashboard...</p>;

  return (
    <DashboardLayout
      title="Admin Dashboard"
      profile={{ name: userName, role: "admin" }}
    >
      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="p-6 bg-white shadow rounded-lg text-center">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-gray-600 capitalize">{key}</p>
          </div>
        ))}
      </div>

      {/* BOOKINGS CHART */}
      <section className="bg-white shadow rounded-lg p-6 mb-12">
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

      {/* USERS TABLE */}
      <section className="mb-12">
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

      {/* PENDING PARTNERS */}
      <section className="mb-12">
        <h3 className="font-semibold mb-4">Pending Partners</h3>
        {pendingPartners.length === 0 ? (
          <p>No pending partners.</p>
        ) : (
          <div className="space-y-4">
            {pendingPartners.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-4 bg-white shadow rounded-lg"
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

      {/* LISTINGS TABLE */}
      <section className="mb-12">
        <h3 className="font-semibold mb-4">Listings</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4">Title</th>
                <th className="py-2 px-4">Owner</th>
                <th className="py-2 px-4">City</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{l.title}</td>
                  <td className="py-2 px-4">{l.partnerId || l.ownerId}</td>
                  <td className="py-2 px-4">{l.city}</td>
                  <td className="py-2 px-4">
                    <span
                      className={`font-medium ${
                        l.approvalStatus === "approved"
                          ? "text-green-600"
                          : l.approvalStatus === "rejected"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {l.approvalStatus || "pending"}
                    </span>
                    {l.rejectionReason && (
                      <p className="text-sm text-red-500 mt-1">{l.rejectionReason}</p>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex flex-col sm:flex-row gap-2">
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
                          setRejectionInputs((prev) => ({
                            ...prev,
                            [l.id]: e.target.value,
                          }))
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

      {/* STAFF TABLE */}
      <section>
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
    </DashboardLayout>
  );
}

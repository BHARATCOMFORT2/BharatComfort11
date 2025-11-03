"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [activeCard, setActiveCard] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/users/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const enriched = data.userSettings.map((u: any) => ({
          ...u,
          totalBookings: u.totalBookings || 0,
          totalCancellations: u.totalCancellations || 0,
          lastLogin: u.lastLogin || null,
          emailVerified: u.emailVerified ?? true,
          phoneVerified: u.phoneVerified ?? true,
          role: u.role || "user",
        }));
        setUsers(enriched);
      } else toast.error(data.error || "Failed to fetch users");
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const getFirebaseIdToken = async () => {
    const { getAuth } = await import("firebase/auth");
    const user = getAuth().currentUser;
    if (user) return await user.getIdToken();
    throw new Error("Admin not authenticated");
  };

  /** 📊 Derived analytics */
  const totalUsers = users.length;
  const upiUsers = users.filter((u) => u.refundPreference === "upi").length;
  const bankUsers = users.filter((u) => u.refundPreference === "bank_transfer").length;
  const aadharUploaded = users.filter((u) => !!u.aadharImageUrl).length;
  const verifiedUsers = users.filter((u) => u.emailVerified && u.phoneVerified).length;

  /** 🔍 Filter & Search Logic */
  const filtered = users
    .filter(
      (u) =>
        (!filterMode || u.refundPreference === filterMode) &&
        (u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.phone?.includes(search))
    )
    .sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
    );

  /** 💾 Export CSV */
  const handleExportCSV = () => {
    const csv = [
      [
        "Name",
        "Email",
        "Phone",
        "Role",
        "Refund Mode",
        "Account Holder",
        "Account Number",
        "IFSC",
        "UPI",
        "Aadhaar",
        "Email Verified",
        "Phone Verified",
        "Bookings",
        "Cancellations",
        "Created",
        "Last Login",
      ],
      ...users.map((u) => [
        u.name,
        u.email,
        u.phone,
        u.role,
        u.refundPreference,
        u.bankDetails?.accountHolder || "",
        u.bankDetails?.accountNumber || "",
        u.bankDetails?.ifsc || "",
        u.bankDetails?.upi || "",
        u.aadharImageUrl ? "Uploaded" : "Not Uploaded",
        u.emailVerified ? "Yes" : "No",
        u.phoneVerified ? "Yes" : "No",
        u.totalBookings,
        u.totalCancellations,
        u.createdAt
          ? new Date(u.createdAt.seconds * 1000).toLocaleDateString()
          : "",
        u.lastLogin
          ? new Date(u.lastLogin.seconds * 1000).toLocaleString()
          : "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  /** 🧭 Click Handler for Summary Cards */
  const handleCardClick = (mode: string) => {
    if (activeCard === mode) {
      setActiveCard("");
      setFilterMode("");
    } else {
      setActiveCard(mode);
      setFilterMode(mode);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ====================== SUMMARY CARDS ====================== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          label="Total Users"
          value={totalUsers}
          color="bg-blue-500"
          active={activeCard === ""}
          onClick={() => handleCardClick("")}
        />
        <SummaryCard
          label="UPI Users"
          value={upiUsers}
          color="bg-green-500"
          active={activeCard === "upi"}
          onClick={() => handleCardClick("upi")}
        />
        <SummaryCard
          label="Bank Users"
          value={bankUsers}
          color="bg-yellow-500"
          active={activeCard === "bank_transfer"}
          onClick={() => handleCardClick("bank_transfer")}
        />
        <SummaryCard
          label="Aadhaar Uploaded"
          value={aadharUploaded}
          color="bg-purple-500"
          active={false}
          onClick={() => toast("Shows only users with Aadhaar uploaded")}
        />
        <SummaryCard
          label="Verified Users"
          value={verifiedUsers}
          color="bg-emerald-500"
          active={false}
          onClick={() => toast("Verification filter coming soon")}
        />
      </div>

      {/* ====================== CONTROLS ====================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">User Management</h1>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by name, email, or phone"
            className="max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded-md p-2"
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              setActiveCard(e.target.value);
            }}
          >
            <option value="">All Modes</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
          </select>
          <Button onClick={handleExportCSV}>Export CSV</Button>
          <Button onClick={fetchUsers} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ====================== TABLE ====================== */}
      <Card className="shadow-sm overflow-x-auto">
        <CardContent className="p-4">
          {loading ? (
            <p>Loading users...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500">No users found.</p>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Verification</th>
                  <th className="p-3 text-left">Refund Mode</th>
                  <th className="p-3 text-left">Bank/UPI</th>
                  <th className="p-3 text-left">Aadhaar</th>
                  <th className="p-3 text-left">Bookings</th>
                  <th className="p-3 text-left">Last Login</th>
                  <th className="p-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-gray-50 transition-all"
                  >
                    <td className="p-3 font-medium">{u.name || "-"}</td>
                    <td className="p-3">{u.email || "-"}</td>
                    <td className="p-3">{u.phone || "-"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-red-100 text-red-600"
                            : u.role === "partner"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-green-100 text-green-600"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className={u.emailVerified ? "text-green-600" : "text-red-500"}>
                          Email: {u.emailVerified ? "✅" : "❌"}
                        </span>
                        <span className={u.phoneVerified ? "text-green-600" : "text-red-500"}>
                          Phone: {u.phoneVerified ? "✅" : "❌"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 capitalize">
                      {u.refundPreference || "bank_transfer"}
                    </td>
                    <td className="p-3">
                      {u.refundPreference === "bank_transfer" ? (
                        <div>
                          <p>{u.bankDetails?.accountHolder || "-"}</p>
                          <p>
                            {u.bankDetails?.accountNumber
                              ? `A/C ****${u.bankDetails.accountNumber.slice(-4)}`
                              : ""}
                          </p>
                          <p>{u.bankDetails?.ifsc || ""}</p>
                        </div>
                      ) : (
                        <p>{u.bankDetails?.upi || "-"}</p>
                      )}
                    </td>
                    <td className="p-3">
                      {u.aadharImageUrl ? (
                        <a
                          href={u.aadharImageUrl}
                          target="_blank"
                          className="text-blue-600 underline"
                        >
                          View
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3">
                      {u.totalBookings || 0} / {u.totalCancellations || 0}
                    </td>
                    <td className="p-3 text-gray-600">
                      {u.lastLogin
                        ? new Date(u.lastLogin.seconds * 1000).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-3 text-gray-500">
                      {u.createdAt
                        ? new Date(u.createdAt.seconds * 1000).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Reusable Summary Card Component with Clickable State */
function SummaryCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all ${
        active ? "ring-4 ring-offset-2 ring-indigo-400 scale-105" : ""
      } ${color} text-white shadow-md hover:opacity-90`}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center text-center select-none">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium opacity-90">{label}</p>
      </CardContent>
    </Card>
  );
}

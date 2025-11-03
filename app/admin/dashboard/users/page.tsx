"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

/**
 * Admin Users Management Page
 * Displays all users with verification, refund, and activity info.
 * Includes filters, export, and search.
 */

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("");

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
        // Extend with placeholders for analytics
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

  // Firebase ID token helper
  const getFirebaseIdToken = async () => {
    const { getAuth } = await import("firebase/auth");
    const user = getAuth().currentUser;
    if (user) return await user.getIdToken();
    throw new Error("Admin not authenticated");
  };

  const filtered = users
    .filter(
      (u) =>
        (!filterMode || u.refundPreference === filterMode) &&
        (u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.phone?.includes(search))
    )
    .sort(
      (a, b) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
    );

  // CSV Export
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

  return (
    <div className="p-6 space-y-6">
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
            onChange={(e) => setFilterMode(e.target.value)}
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

                    {/* Role Badge */}
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

                    {/* Verification */}
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span
                          className={
                            u.emailVerified
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          Email: {u.emailVerified ? "✅" : "❌"}
                        </span>
                        <span
                          className={
                            u.phoneVerified
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          Phone: {u.phoneVerified ? "✅" : "❌"}
                        </span>
                      </div>
                    </td>

                    {/* Refund Preference */}
                    <td className="p-3 capitalize">
                      {u.refundPreference || "bank_transfer"}
                    </td>

                    {/* Bank or UPI Details */}
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

                    {/* Aadhaar */}
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

                    {/* Booking + Activity */}
                    <td className="p-3">
                      {u.totalBookings || 0} / {u.totalCancellations || 0}
                    </td>

                    {/* Last Login */}
                    <td className="p-3 text-gray-600">
                      {u.lastLogin
                        ? new Date(
                            u.lastLogin.seconds * 1000
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    {/* Created */}
                    <td className="p-3 text-gray-500">
                      {u.createdAt
                        ? new Date(
                            u.createdAt.seconds * 1000
                          ).toLocaleDateString()
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

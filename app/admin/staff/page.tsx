"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Staff = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "pending" | "approved" | "rejected" | string;
};

export default function AdminStaffPage() {
  const [pendingStaff, setPendingStaff] = useState<Staff[]>([]);
  const [approvedStaff, setApprovedStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1) Pending staff (using /api/admin/staff/approve GET – jo humne pehle banaya)
      const pendingRes = await fetch("/api/admin/staff/approve");
      const pendingJson = await pendingRes.json();

      if (!pendingRes.ok || !pendingJson.success) {
        throw new Error(pendingJson?.message || "Failed to load pending staff");
      }

      setPendingStaff(pendingJson.data || []);

      // 2) Approved telecallers (using /api/admin/staff/telecallers GET)
      const approvedRes = await fetch("/api/admin/staff/telecallers");
      const approvedJson = await approvedRes.json();

      if (!approvedRes.ok || !approvedJson.success) {
        throw new Error(
          approvedJson?.message || "Failed to load approved staff"
        );
      }

      setApprovedStaff(approvedJson.data || []);
    } catch (err: any) {
      console.error("Staff fetch error:", err);
      toast.error(err?.message || "Staff data load nahi ho paaya");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStaffAction = async (
    staffId: string,
    action: "approve" | "reject"
  ) => {
    try {
      setActionLoadingId(staffId);

      const res = await fetch("/api/admin/staff/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ staffId, action }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Action failed");
      }

      toast.success(
        action === "approve"
          ? "Staff approved successfully"
          : "Staff rejected successfully"
      );

      // Refresh lists
      fetchData();
    } catch (err: any) {
      console.error("Staff action error:", err);
      toast.error(err?.message || "Staff action fail ho gaya");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Staff / Telecaller Management</h1>
          <p className="text-sm text-gray-500">
            Yahan se aap staff requests approve/reject kar sakte hain aur active telecallers dekh sakte hain.
          </p>
        </div>
        {loading && (
          <span className="text-xs text-gray-400">Loading staff data...</span>
        )}
      </div>

      {/* Pending Staff */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-medium">Pending Staff Requests</h2>
          <span className="text-xs text-gray-500">
            {pendingStaff.length} pending
          </span>
        </div>

        {pendingStaff.length === 0 && !loading ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Abhi koi pending staff request nahi hai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td className="px-4 py-2">{staff.name || "-"}</td>
                    <td className="px-4 py-2">{staff.email || "-"}</td>
                    <td className="px-4 py-2">{staff.phone || "-"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                        pending
                      </span>
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() =>
                          handleStaffAction(staff.id, "approve")
                        }
                        disabled={actionLoadingId === staff.id}
                        className="px-3 py-1 text-xs rounded-md bg-emerald-600 text-white disabled:opacity-50"
                      >
                        {actionLoadingId === staff.id &&
                        loading
                          ? "Processing..."
                          : "Approve"}
                      </button>
                      <button
                        onClick={() =>
                          handleStaffAction(staff.id, "reject")
                        }
                        disabled={actionLoadingId === staff.id}
                        className="px-3 py-1 text-xs rounded-md bg-red-600 text-white disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approved Telecallers */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-medium">Approved Telecallers</h2>
          <span className="text-xs text-gray-500">
            {approvedStaff.length} active
          </span>
        </div>

        {approvedStaff.length === 0 && !loading ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Abhi koi approved telecaller nahi hai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {approvedStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td className="px-4 py-2">{staff.name || "-"}</td>
                    <td className="px-4 py-2">{staff.email || "-"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                        approved
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

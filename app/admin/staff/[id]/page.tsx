"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

// =========================
// TYPES
// =========================
type Lead = {
  id: string;
  name?: string;
  businessName?: string;
  address?: string;
  contact?: string;
  email?: string;
  status?: string;
  partnerNotes?: string;
};

type StaffProfile = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: any;
};

type ActivityItem = {
  id: string;
  type: "note" | "call" | "status" | "unknown";
  text?: string;
  outcome?: string;
  note?: string;
  calledBy?: string;
  oldStatus?: string;
  newStatus?: string;
  createdAt: any;
};

// =========================
// PAGE
// =========================
export default function AdminStaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Activity Panel
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLead, setActivityLead] = useState<Lead | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  // =========================
  // FETCH STAFF + LEADS
  // =========================
  useEffect(() => {
    if (!staffId) return;

    const fetchStaffDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/staff/get?staffId=${staffId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to load staff details");
        }

        setStaff(data.staff);
        setLeads(data.leads || []);
      } catch (err: any) {
        console.error("Staff detail error:", err);
        toast.error(err?.message || "Staff detail load nahi ho paaya");
      } finally {
        setLoading(false);
      }
    };

    fetchStaffDetail();
  }, [staffId]);

  // =========================
  // FETCH ACTIVITY TIMELINE
  // =========================
  const openActivity = async (lead: Lead) => {
    setActivityLead(lead);
    setActivityOpen(true);
    setActivityLoading(true);

    try {
      const res = await fetch(`/api/admin/leads/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await auth.currentUser?.getIdToken()) || ""}`,
        },
        body: JSON.stringify({ leadId: lead.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Failed to load activity");
      }

      setActivityItems(data.logs || []);
    } catch (err: any) {
      console.error("Activity error:", err);
      toast.error(err?.message || "Activity load nahi ho paayi");
    } finally {
      setActivityLoading(false);
    }
  };

  // =========================
  // FORMAT DATE
  // =========================
  const formatDate = (ts: any) => {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      });
    } catch {
      return "-";
    }
  };

  // =========================
  // UI START
  // =========================
  return (
    <DashboardLayout title="Staff Details">
      <div className="space-y-6">
        {/* BACK BUTTON */}
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Staff List
        </button>

        {/* STAFF CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-xl font-semibold mb-2">
            {staff?.name || "Staff Member"}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Email:</span> {staff?.email || "-"}
            </div>
            <div>
              <span className="text-gray-500">Phone:</span> {staff?.phone || "-"}
            </div>
            <div>
              <span className="text-gray-500">Status:</span>{" "}
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  staff?.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : staff?.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {staff?.status || "pending"}
              </span>
            </div>
          </div>
        </div>

        {/* LEADS TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium">Assigned Leads</h2>
            {loading && <span className="text-xs text-gray-400">Loading...</span>}
          </div>

          {leads.length === 0 && !loading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Is staff ko abhi tak koi lead assign nahi hui hai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Business
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Contact
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Partner Notes
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Activity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="align-top">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {lead.name || "-"}
                        {lead.email && (
                          <div className="text-xs text-gray-500">
                            {lead.email}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {lead.businessName || "-"}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {lead.contact || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {lead.status || "new"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600 whitespace-pre-wrap">
                          {lead.partnerNotes || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => openActivity(lead)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Activity →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================================
          RIGHT SLIDE-OVER ACTIVITY PANEL
          ================================ */}
      {activityOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-end z-50">
          <div className="w-[360px] max-w-full bg-white h-full shadow-xl border-l border-gray-200 overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Activity Timeline
                </h2>
                <p className="text-[11px] text-gray-500">
                  {activityLead?.name || activityLead?.businessName}
                </p>
              </div>
              <button
                onClick={() => setActivityOpen(false)}
                className="text-gray-500 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Activity Loader */}
            {activityLoading ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Loading activity...
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {activityItems.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm">
                    No activity found.
                  </div>
                ) : (
                  activityItems.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      {/* Timeline Dot */}
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <div className="flex-1 w-[2px] bg-gray-200"></div>
                      </div>

                      {/* Card */}
                      <div className="bg-gray-50 border rounded-lg p-3 w-full shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] font-medium text-gray-700">
                            {log.type === "note"
                              ? "📝 Note Added"
                              : log.type === "call"
                              ? "📞 Call Log"
                              : log.type === "status"
                              ? "🔄 Status Update"
                              : "Activity"}
                          </span>

                          <span className="text-[10px] text-gray-500">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                          {log.text && <p>{log.text}</p>}
                          {log.note && <p>{log.note}</p>}
                          {log.outcome && (
                            <p className="text-blue-700 mt-1">
                              Outcome: {log.outcome}
                            </p>
                          )}
                          {log.oldStatus && log.newStatus && (
                            <p className="text-blue-700 mt-1">
                              {log.oldStatus} → {log.newStatus}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

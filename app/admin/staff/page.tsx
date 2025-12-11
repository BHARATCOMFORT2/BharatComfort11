"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

/* -------------------------
   Types
--------------------------*/
type Staff = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "pending" | "approved" | "rejected" | string;
  isActive?: boolean;
};

type Metrics = {
  totalLeads: number;
  totalCalls: number;
  totalNotes: number;
  convertedLeads: number;
  todaysCalls: number;
  yesterdaysCalls: number;
};

/* -------------------------
   Component
--------------------------*/
export default function AdminStaffPage() {
  const router = useRouter();

  const [pendingStaff, setPendingStaff] = useState<Staff[]>([]);
  const [approvedStaff, setApprovedStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // UI controls: search + status filter + onlyActive
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [onlyActive, setOnlyActive] = useState(false);

  // metrics cache (staffId -> Metrics)
  const [metricsMap, setMetricsMap] = useState<Record<string, Metrics>>({});

  // list loading/state
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1) Pending staff
      const pendingRes = await fetch("/api/admin/staff/approve"); // GET
      const pendingJson = await pendingRes.json();

      if (!pendingRes.ok || !pendingJson.success) {
        throw new Error(pendingJson?.message || "Failed to load pending staff");
      }
      setPendingStaff(pendingJson.data || []);

      // 2) Approved telecallers
      const approvedRes = await fetch("/api/admin/staff/telecallers");
      const approvedJson = await approvedRes.json();

      if (!approvedRes.ok || !approvedJson.success) {
        throw new Error(
          approvedJson?.message || "Failed to load approved staff"
        );
      }

      // ensure isActive present
      const approvedList: Staff[] = (approvedJson.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        status: s.status || "approved",
        isActive: typeof s.isActive === "boolean" ? s.isActive : true,
      }));

      setApprovedStaff(approvedList);

      // Prefetch small metrics for top X approved staff (limit to avoid requests)
      // We'll fetch for up to 12 staff to keep it light
      const sample = approvedList.slice(0, 12);
      const metricsResp = await Promise.allSettled(
        sample.map((st) =>
          fetch("/api/admin/staff/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: st.id }),
          })
        )
      );

      const newMap: Record<string, Metrics> = {};
      await Promise.all(
        metricsResp.map(async (r, idx) => {
          if (r.status === "fulfilled") {
            try {
              const json = await r.value.json();
              if (r.value.ok && json.success && json.metrics) {
                newMap[sample[idx].id] = json.metrics;
              }
            } catch {
              /* ignore per-staff metric fail */
            }
          }
        })
      );

      setMetricsMap((m) => ({ ...m, ...newMap }));
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

  /* -------------------------
     Filtered lists (UI)
  --------------------------*/
  const filteredPending = useMemo(() => {
    return pendingStaff.filter((s) =>
      s.name.toLowerCase().includes(searchQ.toLowerCase())
    );
  }, [pendingStaff, searchQ]);

  const filteredApproved = useMemo(() => {
    return approvedStaff.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (onlyActive && !s.isActive) return false;
      if (searchQ && !s.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    });
  }, [approvedStaff, searchQ, statusFilter, onlyActive]);

  /* -------------------------
     Approve / Reject Handler
  --------------------------*/
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

      // refresh
      await fetchData();
    } catch (err: any) {
      console.error("Staff action error:", err);
      toast.error(err?.message || "Staff action fail ho gaya");
    } finally {
      setActionLoadingId(null);
    }
  };

  /* -------------------------
     Toggle Active / Inactive
     (optimistic UI)
  --------------------------*/
  const toggleActive = async (staffId: string, current: boolean | undefined) => {
    const next = !current;
    setApprovedStaff((prev) => prev.map(s => s.id === staffId ? {...s, isActive: next} : s));
    try {
      const res = await fetch("/api/admin/staff/toggle-active", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ staffId, isActive: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.message || "Toggle failed");
      toast.success(`Staff ${next ? "activated" : "deactivated"}`);
    } catch (err: any) {
      // revert optimistic
      setApprovedStaff((prev) => prev.map(s => s.id === staffId ? {...s, isActive: current} : s));
      console.error("Toggle active error:", err);
      toast.error(err?.message || "Failed to toggle active");
    }
  };

  /* -------------------------
     Show Staff Detail (link)
  --------------------------*/
  const openStaffDetails = (staffId: string) => {
    router.push(`/admin/staff/${staffId}`);
  };

  /* -------------------------
     Manual refresh metrics for a staff
  --------------------------*/
  const refreshMetrics = async (staffId: string) => {
    try {
      const res = await fetch("/api/admin/staff/metrics", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ staffId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.message || "Metrics fetch failed");
      setMetricsMap(m => ({ ...m, [staffId]: json.metrics }));
      toast.success("Metrics updated");
    } catch (err: any) {
      console.error("metrics error:", err);
      toast.error(err?.message || "Failed to load metrics");
    }
  };

  /* -------------------------
     Render
  --------------------------*/
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Staff / Telecaller Management</h1>
          <p className="text-sm text-gray-500">
            Manage staff requests, active telecallers and quick performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search staff name..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <label className="inline-flex items-center text-sm gap-2">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Only Active
          </label>

          <button
            onClick={() => fetchData()}
            className="px-3 py-2 text-sm bg-gray-800 text-white rounded"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Pending Staff */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-medium">Pending Staff Requests</h2>
          <span className="text-xs text-gray-500">{pendingStaff.length} pending</span>
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
                {filteredPending.map((st) => (
                  <tr key={st.id}>
                    <td className="px-4 py-2">{st.name || "-"}</td>
                    <td className="px-4 py-2">{st.email || "-"}</td>
                    <td className="px-4 py-2">{st.phone || "-"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                        pending
                      </span>
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() => handleStaffAction(st.id, "approve")}
                        disabled={actionLoadingId === st.id}
                        className="px-3 py-1 text-xs rounded-md bg-emerald-600 text-white disabled:opacity-50"
                      >
                        {actionLoadingId === st.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleStaffAction(st.id, "reject")}
                        disabled={actionLoadingId === st.id}
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

      {/* Approved Telecallers + Mini Analytics */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-medium">Approved Telecallers</h2>
          <span className="text-xs text-gray-500">{approvedStaff.length} active</span>
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
                  <th className="px-4 py-2 text-left">Performance</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredApproved.map((st) => {
                  const metrics = metricsMap[st.id];
                  return (
                    <tr key={st.id}>
                      <td className="px-4 py-2">
                        <div className="font-medium">{st.name || "-"}</div>
                        <div className="text-xs text-gray-500">{st.phone || st.email}</div>
                      </td>

                      <td className="px-4 py-2">{st.email || "-"}</td>

                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${st.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {st.isActive ? "active" : "inactive"}
                          </span>
                          <button
                            onClick={() => toggleActive(st.id, st.isActive)}
                            className="text-xs text-gray-600 hover:underline"
                          >
                            Toggle
                          </button>
                        </div>
                      </td>

                      {/* Performance badges */}
                      <td className="px-4 py-2">
                        <div className="flex gap-2 items-center flex-wrap">
                          <button
                            onClick={() => openStaffDetails(st.id)}
                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:underline"
                          >
                            View Details
                          </button>

                          {/* Clickable counts - show metrics if available */}
                          <div className="flex gap-1 items-center">
                            <button
                              onClick={() => {
                                if (!metrics) refreshMetrics(st.id);
                                else openStaffDetails(st.id);
                              }}
                              className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                              title="Total leads"
                            >
                              Leads: {metrics ? metrics.totalLeads : "—"}
                            </button>

                            <button
                              onClick={() => {
                                if (!metrics) refreshMetrics(st.id);
                                else openStaffDetails(st.id);
                              }}
                              className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                              title="Calls (today)"
                            >
                              Calls (today): {metrics ? metrics.todaysCalls : "—"}
                            </button>

                            <button
                              onClick={() => {
                                if (!metrics) refreshMetrics(st.id);
                                else openStaffDetails(st.id);
                              }}
                              className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                              title="Converted leads"
                            >
                              Converted: {metrics ? metrics.convertedLeads : "—"}
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openStaffDetails(st.id)}
                            className="px-3 py-1 text-xs rounded-md border text-blue-600"
                          >
                            Details →
                          </button>
                          <button
                            onClick={() => refreshMetrics(st.id)}
                            className="px-3 py-1 text-xs rounded-md bg-gray-50"
                          >
                            Refresh Metrics
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * Fully cleaned & fixed Hiring Admin Dashboard
 * - No duplicate "loading" variable
 * - Admin layout unified
 * - All TS errors removed
 * - Fully aligned with your repo structure
 */

import React, { useEffect, useMemo, useState, useRef } from "react";

// ADMIN LAYOUT + AUTH
import AdminDashboardLayout from "@/components/admin/AdminDashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

// UI
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Search,
  FileDown,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
} from "lucide-react";

type Applicant = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  experience?: string;
  skills?: string;
  status?: string;
  createdAt?: any;
  storagePath?: string | null;
  resumeUrl?: string | null;
  statusHistory?: any[];
  adminNotes?: string;
  [key: string]: any;
};

export default function AdminHiringDashboardPage() {
  // AUTH + ADMIN GUARD
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role)) {
      router.push("/");
    }
  }, [firebaseUser, profile, authLoading, router]);

  // -------------------------------------------------------------------
  // MAIN STATE
  // -------------------------------------------------------------------

  const [items, setItems] = useState<Applicant[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Filters / sort / pagination
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("newest");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const allSelected = useMemo(() => {
    const visibleIds = items.map((i) => i.id);
    if (!visibleIds.length) return false;
    return visibleIds.every((id) => selectedIds[id]);
  }, [items, selectedIds]);

  // Active applicant
  const [active, setActive] = useState<Applicant | null>(null);
  const [resumeViewerUrl, setResumeViewerUrl] = useState<string | null>(null);
  const [showResumeViewer, setShowResumeViewer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  // Status update
  const [statusValue, setStatusValue] = useState("pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [notifyApplicant, setNotifyApplicant] = useState(false);

  // Interview scheduling
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  // Auto refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshIntervalRef = useRef<number | null>(null);

  // Bulk + actions
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // -------------------------------------------------------------------
  // LIST QUERY BUILDER
  // -------------------------------------------------------------------

  function buildListParams() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStatus !== "All") params.set("status", filterStatus.toLowerCase());
    if (filterRole !== "All") params.set("role", filterRole);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("sort", sortBy);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return params.toString();
  }

  // -------------------------------------------------------------------
  // FETCH LIST
  // -------------------------------------------------------------------

  async function fetchList() {
    setLoadingList(true);
    try {
      const q = buildListParams();
      const res = await fetch(`/api/admin/hiring/list?${q}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("fetchList error", err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, [search, filterRole, filterStatus, dateFrom, dateTo, sortBy, page]);

  // -------------------------------------------------------------------
  // AUTO REFRESH
  // -------------------------------------------------------------------

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = window.setInterval(() => {
        fetchList();
      }, 30000);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh]);

  // -------------------------------------------------------------------
  // SELECTION
  // -------------------------------------------------------------------

  function toggleSelect(id: string) {
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  }

  function toggleSelectAll() {
    if (allSelected) {
      const newMap = { ...selectedIds };
      items.forEach((it) => delete newMap[it.id]);
      setSelectedIds(newMap);
    } else {
      const newMap = { ...selectedIds };
      items.forEach((it) => (newMap[it.id] = true));
      setSelectedIds(newMap);
    }
  }

  function getSelectedList() {
    return Object.keys(selectedIds).filter((id) => selectedIds[id]);
  }

  // -------------------------------------------------------------------
  // OPEN DETAILS
  // -------------------------------------------------------------------

  async function openDetails(app: Applicant) {
    setActive(app);
    setStatusValue(app.status || "pending");
    setAdminNotes(app.adminNotes || "");
    setNotifyApplicant(false);

    if (app.storagePath) {
      try {
        const r = await fetch(
          `/api/admin/hiring/download?path=${encodeURIComponent(app.storagePath)}`
        );
        const d = await r.json();
        if (d.success && d.url) {
          setResumeViewerUrl(d.url);
        }
      } catch {}
    } else {
      setResumeViewerUrl(null);
    }
  }

  // -------------------------------------------------------------------
  // STATUS UPDATE (single)
  // -------------------------------------------------------------------

  async function updateStatusSingle(
    id: string,
    newStatus: string,
    notes = "",
    notify = false
  ) {
    setLoadingActionId(id);
    try {
      const res = await fetch("/api/admin/hiring/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, newStatus, adminNotes: notes, notify }),
      });
      const data = await res.json();
      if (data.success) fetchList();
      else alert(data.error || "Update failed");
    } catch (err) {
      alert("Error updating status");
    } finally {
      setLoadingActionId(null);
    }
  }

  // -------------------------------------------------------------------
  // BULK ACTIONS
  // -------------------------------------------------------------------

  async function bulkUpdateStatus(newStatus: string) {
    const ids = getSelectedList();
    if (!ids.length) return alert("No applicants selected");

    setLoadingBulk(true);
    try {
      for (const id of ids) {
        await updateStatusSingle(id, newStatus, `Bulk: ${newStatus}`, false);
      }
      setSelectedIds({});
      fetchList();
    } finally {
      setLoadingBulk(false);
    }
  }

  async function bulkDeleteSelected() {
    return bulkUpdateStatus("deleted");
  }

  // -------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------

  function exportCSV() {
    const params = buildListParams();
    window.open(`/api/admin/hiring/export/csv?${params}`, "_blank");
  }

  function exportPDF() {
    const params = buildListParams();
    window.open(`/api/admin/hiring/export/pdf?${params}`, "_blank");
  }

  function exportSelectedCSV() {
    const ids = getSelectedList();
    if (!ids.length) return alert("No applicants selected");
    const rows = items.filter((it) => ids.includes(it.id));

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Role",
      "Experience",
      "Status",
      "CreatedAt",
      "ResumeUrl",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.name || "",
          r.email || "",
          r.phone || "",
          r.role || "",
          r.experience || "",
          r.status || "",
          r.createdAt?._seconds
            ? new Date(r.createdAt._seconds * 1000).toISOString()
            : "",
          r.resumeUrl || "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hiring_selected_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  // -------------------------------------------------------------------
  // STATUS BADGE COLOR
  // -------------------------------------------------------------------

  function statusVariant(status?: string) {
    switch ((status || "").toLowerCase()) {
      case "hired":
      case "approved":
        return "success";
      case "shortlisted":
        return "secondary";
      case "reviewing":
        return "warning";
      case "rejected":
      case "deleted":
        return "destructive";
      default:
        return "default";
    }
  }

  // -------------------------------------------------------------------
  // PAGINATION
  // -------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function gotoPage(p: number) {
    setPage(Math.min(Math.max(p, 1), totalPages));
  }

  // -------------------------------------------------------------------
  // RENDER UI
  // -------------------------------------------------------------------

  return (
    <AdminDashboardLayout title="Hiring Admin Dashboard" profile={profile}>
      <div className="p-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Hiring Admin Dashboard</h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 border rounded"
            >
              <RefreshCw className="w-4 h-4" />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>

            <Button onClick={exportCSV} variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>

            <Button onClick={exportPDF} variant="ghost" size="sm">
              <FileDown className="w-4 h-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded p-4 mb-6 shadow-sm">

          {/* ROW 1 */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">

            {/* SEARCH */}
            <div className="flex items-center gap-2 w-full md:w-1/3">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search name / email / phone"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* FILTERS */}
            <div className="flex gap-3">

              {/* ROLE */}
              <Select
                value={filterRole}
                onValueChange={(v) => {
                  setFilterRole(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Roles</SelectItem>
                  <SelectItem value="Telecaller">Telecaller</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              {/* STATUS */}
              <Select
                value={filterStatus}
                onValueChange={(v) => {
                  setFilterStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                </SelectContent>
              </Select>

              {/* DATE RANGE */}
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateFrom || ""}
                  onChange={(e) => {
                    setDateFrom(e.target.value || null);
                    setPage(1);
                  }}
                  className="border rounded p-2"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateTo || ""}
                  onChange={(e) => {
                    setDateTo(e.target.value || null);
                    setPage(1);
                  }}
                  className="border rounded p-2"
                />
              </div>

              {/* SORT */}
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  setSortBy(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="name_asc">Name A→Z</SelectItem>
                  <SelectItem value="name_desc">Name Z→A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* BULK ACTIONS */}
          <div className="flex items-center gap-2 mt-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              <span>Select all on page</span>
            </label>

            <Button
              onClick={() => bulkUpdateStatus("shortlisted")}
              disabled={loadingBulk}
            >
              Shortlist Selected
            </Button>

            <Button
              onClick={() => bulkUpdateStatus("rejected")}
              disabled={loadingBulk}
              variant="destructive"
            >
              Reject Selected
            </Button>

            <Button disabled={loadingBulk} onClick={exportSelectedCSV}>
              Export Selected CSV
            </Button>

            <Button
              disabled={loadingBulk}
              onClick={bulkDeleteSelected}
              variant="destructive"
            >
              Delete Selected
            </Button>
          </div>
        </div>

        {/* LIST */}
        <div className="bg-white rounded shadow overflow-hidden">
          {loadingList ? (
            <div className="p-6 text-center">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No applications found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left w-6">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Experience</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((app) => (
                    <tr key={app.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={!!selectedIds[app.id]}
                          onChange={() => toggleSelect(app.id)}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium">{app.name}</div>
                        <div className="text-xs text-gray-500">{app.email}</div>
                      </td>

                      <td className="px-4 py-3">{app.role || "-"}</td>
                      <td className="px-4 py-3">{app.experience || "-"}</td>
                      <td className="px-4 py-3">{app.email || "-"}</td>
                      <td className="px-4 py-3">{app.phone || "-"}</td>

                      <td className="px-4 py-3 text-gray-500">
                        {app.createdAt?._seconds
                          ? new Date(
                              app.createdAt._seconds * 1000
                            ).toLocaleString()
                          : "-"}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(app.status)}>
                          {app.status || "pending"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">

                          {/* VIEW RESUME */}
                          {(app.storagePath || app.resumeUrl) && (
                            <button
                              onClick={async () => {
                                if (app.resumeUrl) {
                                  setResumeViewerUrl(app.resumeUrl);
                                  setShowResumeViewer(true);
                                } else if (app.storagePath) {
                                  try {
                                    const r = await fetch(
                                      `/api/admin/hiring/download?path=${encodeURIComponent(
                                        app.storagePath
                                      )}`
                                    );
                                    const d = await r.json();
                                    if (d.success && d.url) {
                                      setResumeViewerUrl(d.url);
                                      setShowResumeViewer(true);
                                    }
                                  } catch {}
                                }
                              }}
                              className="inline-flex items-center px-2 py-1 border rounded"
                            >
                              <Eye className="w-4 h-4 mr-1" /> View
                            </button>
                          )}

                          {/* MANAGE */}
                          <button
                            onClick={() => openDetails(app)}
                            className="inline-flex items-center px-2 py-1 border rounded"
                          >
                            <Settings className="w-4 h-4" />
                          </button>

                          {/* QUICK SHORTLIST */}
                          <button
                            onClick={() =>
                              updateStatusSingle(
                                app.id,
                                "shortlisted",
                                "Shortlisted by admin",
                                false
                              )
                            }
                            className="inline-flex items-center px-2 py-1 border rounded"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </button>

                          {/* QUICK REJECT */}
                          <button
                            onClick={() =>
                              updateStatusSingle(
                                app.id,
                                "rejected",
                                "Rejected by admin",
                                false
                              )
                            }
                            className="inline-flex items-center px-2 py-1 border rounded"
                          >
                            <XCircle className="w-4 h-4 text-red-600" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm">
            Page {page} of {totalPages} — {total} total
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => gotoPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-2 border rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => gotoPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-2 border rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RESUME VIEWER MODAL */}
        {showResumeViewer && resumeViewerUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-[90%] md:w-3/4 h-[80%] rounded p-4 relative">
              <div className="flex justify-between mb-2">
                <h3 className="text-lg font-semibold">Resume Preview</h3>

                <div className="flex gap-2">
                  <a
                    href={resumeViewerUrl}
                    target="_blank"
                    className="px-3 py-1 border rounded inline-flex items-center"
                  >
                    <Download className="w-4 h-4 mr-1" /> Download
                  </a>
                  <Button onClick={() => setShowResumeViewer(false)}>
                    Close
                  </Button>
                </div>
              </div>

              <iframe
                src={resumeViewerUrl}
                className="w-full h-full border rounded"
              />
            </div>
          </div>
        )}

        {/* MANAGE APPLICANT PANEL */}
        {active && (
          <div className="mt-6 border p-4 bg-gray-50 rounded">
            <div className="flex justify-between">
              <div>
                <h2 className="text-lg font-semibold">{active.name}</h2>
                <div className="text-xs text-gray-600">ID: {active.id}</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => { setActive(null); setShowHistory(false); }}>
                  Close
                </Button>

                <Button onClick={() => setShowHistory((v) => !v)}>
                  {showHistory ? "Hide History" : "Show History"}
                </Button>

                <Button onClick={() => setShowInterviewModal(true)}>
                  <Calendar className="w-4 h-4 mr-1" /> Interview
                </Button>
              </div>
            </div>

            {/* DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p><strong>Email:</strong> {active.email}</p>
                <p><strong>Phone:</strong> {active.phone}</p>
                <p><strong>Role:</strong> {active.role}</p>
                <p><strong>Experience:</strong> {active.experience}</p>
                <p><strong>Skills:</strong> {active.skills}</p>
              </div>

              {/* STATUS EDITOR */}
              <div>
                <label className="block text-sm">Status</label>

                <Select
                  value={statusValue}
                  onValueChange={(v) => setStatusValue(v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>

                <label className="block text-sm mt-3">Admin Notes</label>
                <textarea
                  className="w-full border rounded p-2"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={notifyApplicant}
                    onChange={(e) => setNotifyApplicant(e.target.checked)}
                  />
                  <span>Notify applicant by email</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() =>
                      updateStatusSingle(
                        active.id,
                        statusValue,
                        adminNotes,
                        notifyApplicant
                      )
                    }
                  >
                    Save
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      updateStatusSingle(
                        active.id,
                        "shortlisted",
                        "Quick shortlist",
                        false
                      )
                    }
                  >
                    Quick Shortlist
                  </Button>
                </div>
              </div>
            </div>

            {/* EXTRA ACTIONS */}
            <div className="mt-4 flex gap-3 items-center">
              {resumeViewerUrl || active.resumeUrl ? (
                <Button
                  onClick={() =>
                    setShowResumeViewer(true)
                  }
                >
                  <FileDown className="w-4 h-4 mr-1" /> View Resume
                </Button>
              ) : (
                <div className="text-sm text-gray-500">No resume attached</div>
              )}

              <Button onClick={() => exportSelectedCSV()}>
                <Download className="w-4 h-4 mr-1" /> Export Selected
              </Button>

              <Button
                variant="destructive"
                onClick={() =>
                  updateStatusSingle(active.id, "deleted", "Deleted by admin", false)
                }
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>

            {/* HISTORY */}
            {showHistory && active.statusHistory && (
              <div className="mt-4">
                <h3 className="font-semibold">Activity History</h3>
                <ul className="space-y-2 mt-2">
                  {active.statusHistory.map((h, i) => (
                    <li key={i} className="border p-2 rounded">
                      <div className="text-sm font-medium">{h.action}</div>
                      <div className="text-xs">{h.message}</div>
                      <div className="text-xs text-gray-500">
                        {h.timestamp
                          ? new Date(
                              h.timestamp._seconds
                                ? h.timestamp._seconds * 1000
                                : h.timestamp
                            ).toLocaleString()
                          : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* INTERVIEW MODAL */}
        {showInterviewModal && active && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-4 rounded w-full max-w-lg">
              <div className="flex justify-between">
                <h3 className="text-lg font-semibold">
                  Interview – {active.name}
                </h3>
                <Button onClick={() => setShowInterviewModal(false)}>
                  Close
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-3">

                <div>
                  <label className="block text-sm">Date</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="border p-2 rounded w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm">Time</label>
                  <input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="border p-2 rounded w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm">Notes</label>
                  <textarea
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    className="border p-2 rounded w-full h-24"
                  />
                </div>

                <Button onClick={() => alert("Interview saved (API missing)")}>
                  Save
                </Button>

              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}

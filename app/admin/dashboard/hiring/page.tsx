"use client";

/**
 * Mega upgraded Hiring Admin Dashboard (ONE BIG file)
 * Path: /app/admin/dashboard/hiring/page.tsx
 *
 * Notes:
 * - This client page talks to server APIs (Option B) that should exist:
 *   - GET  /api/admin/hiring/list            -> list (search, status, sort, page, limit, dateFrom, dateTo)
 *   - POST /api/admin/hiring/status          -> update single applicant status
 *   - GET  /api/admin/hiring/download?path=  -> get signed resume url
 *   - GET  /api/admin/hiring/export/csv      -> csv export
 *   - GET  /api/admin/hiring/export/pdf      -> pdf export
 *   - POST /api/admin/hiring/schedule        -> schedule interview (optional backend)
 *
 * If any of these endpoints are missing, either add them server-side or let me generate them.
 */

import React, { useEffect, useMemo, useState, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

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
} from "@/components/ui/Select";
import {
  Search,
  FileDown,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  RefreshCw,
  Calendar,
  Clock,
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
  // Data + UI state
  const [items, setItems] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters / sort / pagination
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | name_asc | name_desc

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // selection + bulk
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const allSelected = useMemo(() => {
    const visibleIds = items.map((i) => i.id);
    if (!visibleIds.length) return false;
    return visibleIds.every((id) => selectedIds[id]);
  }, [items, selectedIds]);

  // active applicant details / modals
  const [active, setActive] = useState<Applicant | null>(null);
  const [showResumeViewer, setShowResumeViewer] = useState(false);
  const [resumeViewerUrl, setResumeViewerUrl] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  // status update inputs
  const [statusValue, setStatusValue] = useState("pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [notifyApplicant, setNotifyApplicant] = useState(false);

  // interview scheduling
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  // auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshIntervalRef = useRef<number | null>(null);

  // misc
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // helper: build query params for list
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

  // fetch list
  async function fetchList() {
    setLoading(true);
    try {
      const q = buildListParams();
      const res = await fetch(`/api/admin/hiring/list?${q}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setTotal(data.total || 0);
      } else {
        console.error("List error", data);
      }
    } catch (err) {
      console.error("List fetch failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterRole, filterStatus, dateFrom, dateTo, sortBy, page]);

  // auto refresh effect
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = window.setInterval(() => {
        fetchList();
      }, 30000); // 30s
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh]);

  // select logic
  function toggleSelect(id: string) {
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  }
  function toggleSelectAll() {
    if (allSelected) {
      // unselect all visible
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

  // open details
  async function openDetails(app: Applicant) {
    setActive(app);
    setStatusValue(app.status || "pending");
    setAdminNotes(app.adminNotes || "");
    setNotifyApplicant(false);
    // Pre-fetch signed resume url if exists
    if (app.storagePath) {
      try {
        const res = await fetch(
          `/api/admin/hiring/download?path=${encodeURIComponent(app.storagePath)}`
        );
        const data = await res.json();
        if (data.success && data.url) {
          setResumeViewerUrl(data.url);
          // also set resumeUrl on active (local) for easy download
          setActive((prev) => (prev ? { ...prev, resumeUrl: data.url } : prev));
        } else {
          setResumeViewerUrl(null);
        }
      } catch {
        setResumeViewerUrl(null);
      }
    } else {
      setResumeViewerUrl(null);
    }
  }

  // view resume
  function openResumeViewer(url?: string | null) {
    if (url) {
      setResumeViewerUrl(url);
      setShowResumeViewer(true);
    } else {
      setResumeViewerUrl(null);
      setShowResumeViewer(false);
      alert("No resume available");
    }
  }

  // update status (single)
  async function updateStatusSingle(id: string, newStatus: string, notes = "", notify = false) {
    setLoadingActionId(id);
    try {
      const res = await fetch("/api/admin/hiring/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, newStatus, adminNotes: notes, notify }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchList();
      } else {
        alert(data.error || "Failed updating status");
      }
    } catch (err) {
      console.error("status update error", err);
      alert("Status update failed");
    } finally {
      setLoadingActionId(null);
    }
  }

  // bulk update (loops and calls status endpoint for each selected id)
  async function bulkUpdateStatus(newStatus: string, notify = false) {
    const ids = getSelectedList();
    if (!ids.length) return alert("No applicants selected");
    if (!confirm(`Update ${ids.length} applicants to "${newStatus}"?`)) return;

    setLoadingBulk(true);
    try {
      for (const id of ids) {
        // sequential to avoid rate limits; if you prefer parallel, use Promise.all
        // eslint-disable-next-line no-await-in-loop
        await updateStatusSingle(id, newStatus, `Bulk: ${newStatus}`, notify);
      }
      // clear selection
      setSelectedIds({});
      await fetchList();
      alert("Bulk update completed");
    } catch (err) {
      console.error("bulk update error", err);
      alert("Bulk update encountered an error");
    } finally {
      setLoadingBulk(false);
    }
  }

  // export CSV (server side export with current filters) -> opens in new tab
  function exportCSV() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStatus !== "All") params.set("status", filterStatus.toLowerCase());
    if (filterRole !== "All") params.set("role", filterRole);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/admin/hiring/export/csv?${params.toString()}`, "_blank");
  }

  // export PDF (server side export with current filters)
  function exportPDF() {
    const params = new URLSearchParams();
    if (filterStatus !== "All") params.set("status", filterStatus.toLowerCase());
    if (filterRole !== "All") params.set("role", filterRole);
    window.open(`/api/admin/hiring/export/pdf?${params.toString()}`, "_blank");
  }

  // local CSV export selected
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
            : r.createdAt || "",
          r.resumeUrl || "",
        ]
          .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hiring_selected_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  // delete selected (soft-delete via status 'deleted' for now)
  async function bulkDeleteSelected() {
    const ids = getSelectedList();
    if (!ids.length) return alert("No applicants selected");
    if (!confirm(`Mark ${ids.length} applicants as deleted? This is reversible via admin.`)) return;
    setLoadingBulk(true);
    try {
      for (const id of ids) {
        // mark as deleted
        // backend may not accept 'deleted' status; alternatively you can create a delete endpoint
        // we'll reuse status endpoint
        // eslint-disable-next-line no-await-in-loop
        await updateStatusSingle(id, "deleted", "Marked deleted by admin bulk action", false);
      }
      setSelectedIds({});
      await fetchList();
      alert("Marked selected as deleted");
    } catch (err) {
      console.error(err);
      alert("Bulk delete failed");
    } finally {
      setLoadingBulk(false);
    }
  }

  // schedule interview
  async function scheduleInterviewForActive() {
    if (!active) return;
    if (!interviewDate || !interviewTime) return alert("Choose date and time");
    try {
      const res = await fetch("/api/admin/hiring/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: active.id,
          datetime: `${interviewDate}T${interviewTime}`,
          notes: interviewNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Interview scheduled");
        setShowInterviewModal(false);
        setInterviewDate("");
        setInterviewTime("");
        setInterviewNotes("");
        fetchList();
      } else {
        alert(data.error || "Scheduling failed");
      }
    } catch (err) {
      console.error("schedule error", err);
      alert("Scheduling failed");
    }
  }

  // small helper for status badge color
  function statusVariant(status?: string) {
    switch ((status || "").toLowerCase()) {
      case "approved":
      case "hired":
        return "success";
      case "shortlisted":
        return "secondary";
      case "reviewing":
        return "warning";
      case "rejected":
      case "deleted":
        return "destructive";
      case "pending":
      default:
        return "default";
    }
  }

  // pagination controls
  const totalPages = Math.max(1, Math.ceil(total / limit));
  function gotoPage(p: number) {
    const np = Math.min(Math.max(1, p), totalPages);
    setPage(np);
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Hiring Admin Dashboard</h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAutoRefresh((v) => !v);
              }}
              className="flex items-center gap-2 px-3 py-2 border rounded"
              title="Toggle auto-refresh (30s)"
            >
              <RefreshCw className="w-4 h-4" />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>

            <div className="flex gap-2">
              <Button onClick={exportCSV} variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>

              <Button onClick={exportPDF} variant="ghost" size="sm">
                <FileDown className="w-4 h-4 mr-1" /> Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 w-full md:w-1/3">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search name / email / phone"
                value={search}
                onChange={(e: any) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex gap-3">
              <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); setPage(1); }}>
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

              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
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

              {/* Date range — fall back to simple inputs if no datepicker */}
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateFrom || ""}
                  onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }}
                  className="border rounded p-2"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateTo || ""}
                  onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }}
                  className="border rounded p-2"
                />
              </div>

              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
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

          {/* Bulk actions */}
          <div className="flex items-center gap-2 mt-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              <span>Select all on page</span>
            </label>

            <Button onClick={() => bulkUpdateStatus("shortlisted", false)} disabled={loadingBulk}>
              Shortlist Selected
            </Button>
            <Button onClick={() => bulkUpdateStatus("rejected", false)} disabled={loadingBulk} variant="destructive">
              Reject Selected
            </Button>

            <Button onClick={exportSelectedCSV} disabled={loadingBulk}>
              Export Selected CSV
            </Button>

            <Button onClick={bulkDeleteSelected} disabled={loadingBulk} variant="destructive">
              Delete Selected
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No applications found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left w-6">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
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
                        <input type="checkbox" checked={!!selectedIds[app.id]} onChange={() => toggleSelect(app.id)} />
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
                          ? new Date(app.createdAt._seconds * 1000).toLocaleString()
                          : app.createdAt
                          ? new Date(app.createdAt).toLocaleString()
                          : "-"}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(app.status)}>{app.status || "pending"}</Badge>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {app.storagePath || app.resumeUrl ? (
                            <button
                              onClick={async () => {
                                // ensure signed url
                                if (app.resumeUrl) {
                                  openResumeViewer(app.resumeUrl);
                                } else if (app.storagePath) {
                                  try {
                                    const r = await fetch(`/api/admin/hiring/download?path=${encodeURIComponent(app.storagePath)}`);
                                    const d = await r.json();
                                    if (d.success && d.url) {
                                      openResumeViewer(d.url);
                                    } else {
                                      alert("Unable to fetch resume");
                                    }
                                  } catch {
                                    alert("Unable to fetch resume");
                                  }
                                } else {
                                  alert("No resume");
                                }
                              }}
                              title="View Resume"
                              className="inline-flex items-center px-2 py-1 border rounded"
                            >
                              <Eye className="w-4 h-4 mr-1" /> View
                            </button>
                          ) : null}

                          <button
                            onClick={() => openDetails(app)}
                            title="Manage"
                            className="inline-flex items-center px-2 py-1 border rounded"
                          >
                            <Settings className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => updateStatusSingle(app.id, "shortlisted", "Shortlisted by admin", false)}
                            title="Shortlist"
                            className="inline-flex items-center px-2 py-1 border rounded"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </button>

                          <button
                            onClick={() => updateStatusSingle(app.id, "rejected", "Rejected by admin", false)}
                            title="Reject"
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

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing page {page} of {totalPages} — {total} total
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => gotoPage(page - 1)} disabled={page <= 1} className="px-3 py-2 border rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => gotoPage(page + 1)} disabled={page >= totalPages} className="px-3 py-2 border rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active / Manage modal area (inline) */}
        {active && (
          <div className="mt-6 border p-4 bg-gray-50 rounded">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">Manage: {active.name}</h2>
                <div className="text-xs text-gray-500">ID: {active.id}</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => { setActive(null); setShowHistory(false); }}>
                  Close
                </Button>
                <Button onClick={() => setShowHistory((s) => !s)}>
                  {showHistory ? "Hide History" : "Show History"}
                </Button>
                <Button onClick={() => setShowInterviewModal(true)}>
                  <Calendar className="w-4 h-4 mr-1" /> Schedule Interview
                </Button>
              </div>
            </div>

            {/* details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p><strong>Email:</strong> {active.email}</p>
                <p><strong>Phone:</strong> {active.phone}</p>
                <p><strong>Role:</strong> {active.role}</p>
                <p><strong>Experience:</strong> {active.experience}</p>
                <p><strong>Skills:</strong> {active.skills}</p>
              </div>

              <div>
                <label className="block text-sm">Status</label>
                <Select value={statusValue} onValueChange={(v) => setStatusValue(v)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
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
                <textarea className="w-full border rounded p-2" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={notifyApplicant} onChange={(e) => setNotifyApplicant(e.target.checked)} />
                  <span>Notify applicant by email</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button onClick={() => updateStatusSingle(active.id, statusValue, adminNotes, notifyApplicant)}>
                    Save
                  </Button>

                  <Button onClick={() => {
                    // quick actions
                    updateStatusSingle(active.id, "shortlisted", "Shortlisted via quick action", false);
                  }} variant="outline">
                    Quick Shortlist
                  </Button>
                </div>
              </div>
            </div>

            {/* Resume + actions */}
            <div className="mt-4 flex gap-3 items-center">
              {resumeViewerUrl || active.resumeUrl ? (
                <Button onClick={() => openResumeViewer(active.resumeUrl || resumeViewerUrl)}>
                  <FileDown className="w-4 h-4 mr-1" /> View Resume
                </Button>
              ) : (
                <div className="text-sm text-gray-500">No resume attached</div>
              )}

              <Button onClick={() => exportSelectedCSV()}>
                <Download className="w-4 h-4 mr-1" /> Export Selected
              </Button>

              <Button onClick={() => { if (confirm("Are you sure?")) { updateStatusSingle(active.id, "deleted", "Deleted by admin", false); }}} variant="destructive">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>

            {/* history */}
            {showHistory && active.statusHistory && (
              <div className="mt-4">
                <h3 className="font-semibold">Activity History</h3>
                <ul className="space-y-2 mt-2">
                  {active.statusHistory.map((h: any, i: number) => (
                    <li key={i} className="border p-2 rounded">
                      <div className="text-sm"><strong>{h.action || h.status}</strong> — {h.by || "system"}</div>
                      <div className="text-xs text-gray-600">{h.message}</div>
                      <div className="text-xs text-gray-400">{h.timestamp ? new Date(h.timestamp._seconds ? h.timestamp._seconds * 1000 : h.timestamp).toLocaleString() : "-"}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Resume viewer modal (simple) */}
        {showResumeViewer && resumeViewerUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-[90%] md:w-3/4 h-[80%] rounded p-4 relative">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Resume Preview</h3>
                <div className="flex items-center gap-2">
                  <a href={resumeViewerUrl} target="_blank" rel="noreferrer" className="px-3 py-1 border rounded inline-flex items-center">
                    <Download className="w-4 h-4 mr-1" /> Download
                  </a>
                  <Button onClick={() => setShowResumeViewer(false)}>Close</Button>
                </div>
              </div>

              <div className="h-full">
                {/* PDF via iframe is the simplest approach */}
                <iframe src={resumeViewerUrl} className="w-full h-full border rounded" title="Resume Viewer" />
              </div>
            </div>
          </div>
        )}

        {/* Interview modal */}
        {showInterviewModal && active && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-4 rounded w-full max-w-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Schedule Interview for {active.name}</h3>
                <Button onClick={() => setShowInterviewModal(false)}>Close</Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm">Date</label>
                  <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm">Time</label>
                  <input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} className="border p-2 rounded w-full" />
                </div>

                <div>
                  <label className="block text-sm">Notes (optional)</label>
                  <textarea value={interviewNotes} onChange={(e) => setInterviewNotes(e.target.value)} className="border p-2 rounded w-full h-24" />
                </div>

                <div className="flex gap-2">
                  <Button onClick={scheduleInterviewForActive}>Schedule</Button>
                  <Button onClick={() => setShowInterviewModal(false)} variant="ghost">Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

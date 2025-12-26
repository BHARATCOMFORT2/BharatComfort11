"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

type Lead = {
  id: string;
  name: string;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  assignedTo?: string | null;
  category?: string;
  followupDate?: string;
  createdAt?: any;
};

type Staff = {
  id: string;
  name: string;
};

export default function AdminLeadsPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading } = useAuth();

  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkStaff, setBulkStaff] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* =====================================================
     ✅ ADMIN PROTECTION + TOKEN
  ===================================================== */
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then(setToken);
  }, [firebaseUser, profile, loading, router]);

  /* =====================================================
     ✅ QUICK DATE FILTERS
  ===================================================== */
  const applyQuickFilter = (
    type: "today" | "yesterday" | "week" | "month"
  ) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (type) {
      case "today":
        from = new Date();
        from.setHours(0, 0, 0, 0);
        to = new Date();
        to.setHours(23, 59, 59, 999);
        break;

      case "yesterday":
        from = new Date();
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to = new Date();
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;

      case "week":
        const day = now.getDay() || 7; // Monday start
        from = new Date(now);
        from.setDate(now.getDate() - day + 1);
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(from.getDate() + 6);
        to.setHours(23, 59, 59, 999);
        break;

      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        break;
    }

    setFromDate(from.toISOString().slice(0, 10));
    setToDate(to.toISOString().slice(0, 10));

    setTimeout(fetchLeads, 50);
  };

  /* =====================================================
     ✅ FETCH LEADS
  ===================================================== */
  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/admin/leads/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Leads fetch failed");
      }

      let list: Lead[] = data.data || [];

      // Date range filter
      if (fromDate || toDate) {
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        if (to) to.setHours(23, 59, 59, 999);

        list = list.filter((lead) => {
          if (!lead.createdAt?.seconds) return false;
          const created = new Date(lead.createdAt.seconds * 1000);
          if (from && created < from) return false;
          if (to && created > to) return false;
          return true;
        });
      }

      setLeads(list);
      setSelectedLeads([]);
    } catch (err: any) {
      toast.error(err?.message || "Leads load nahi ho paaye");
    }
  };

  /* =====================================================
     ✅ FETCH STAFF
  ===================================================== */
  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/admin/staff/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Staff fetch failed");
      }

      setStaffList(data.data || []);
    } catch {
      toast.error("Telecaller list load nahi hui");
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchLeads();
    fetchStaff();
  }, [token]);

  /* =====================================================
     ✅ EXCEL UPLOAD
  ===================================================== */
  const handleUpload = async () => {
    if (!file) return toast.error("Please select an Excel file");

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/leads/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Upload failed");
      }

      toast.success(`Leads imported: ${data.successCount}/${data.total}`);
      setFile(null);
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || "Excel upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* =====================================================
     ✅ ASSIGN LOGIC
  ===================================================== */
  const handleAssign = async (leadId: string, staffId: string) => {
    if (!staffId) return;

    setAssigning(leadId);
    try {
      const res = await fetch("/api/admin/leads/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, staffId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Assignment failed");
      }

      toast.success("Lead assigned");
      fetchLeads();
    } catch {
      toast.error("Assignment failed");
    } finally {
      setAssigning(null);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkStaff || selectedLeads.length === 0)
      return toast.error("Select leads & staff");

    try {
      const res = await fetch("/api/admin/leads/assign-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadIds: selectedLeads,
          staffId: bulkStaff,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error();
      }

      toast.success("Bulk assignment done");
      setSelectedLeads([]);
      setBulkStaff("");
      fetchLeads();
    } catch {
      toast.error("Bulk assign failed");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map((l) => l.id));
    }
  };

  if (loading || !profile) return <p className="p-6">Loading...</p>;

  /* =====================================================
     ✅ UI
  ===================================================== */
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Admin Lead / Task Management</h1>

      {/* QUICK FILTERS */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => applyQuickFilter("today")} className="px-3 py-1 border rounded text-xs">Today</button>
        <button onClick={() => applyQuickFilter("yesterday")} className="px-3 py-1 border rounded text-xs">Yesterday</button>
        <button onClick={() => applyQuickFilter("week")} className="px-3 py-1 border rounded text-xs">This Week</button>
        <button onClick={() => applyQuickFilter("month")} className="px-3 py-1 border rounded text-xs">This Month</button>
      </div>

      {/* DATE FILTER + IMPORT */}
      <div className="flex flex-wrap gap-3 items-end">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border px-2 py-1 rounded text-sm" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border px-2 py-1 rounded text-sm" />
        <button onClick={fetchLeads} className="px-4 py-2 bg-black text-white text-sm rounded">
          Filter
        </button>

        <div className="flex gap-2 ml-auto">
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button onClick={handleUpload} disabled={uploading} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
            {uploading ? "Uploading..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* BULK ASSIGN */}
      <div className="flex gap-3 bg-gray-50 p-3 border rounded">
        <select value={bulkStaff} onChange={(e) => setBulkStaff(e.target.value)} className="border px-2 py-1 rounded text-sm">
          <option value="">Select Telecaller</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <button onClick={handleBulkAssign} className="px-4 py-2 bg-green-600 text-white rounded text-sm">
          Assign Selected ({selectedLeads.length})
        </button>
      </div>

      {/* TABLE */}
      <div className="border rounded overflow-hidden bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th><input type="checkbox" checked={leads.length > 0 && selectedLeads.length === leads.length} onChange={toggleAll} /></th>
              <th>Name</th>
              <th>Business</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Assign</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t">
                <td><input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelect(lead.id)} /></td>
                <td>{lead.name}</td>
                <td>{lead.businessName}</td>
                <td>{lead.phone}</td>
                <td>{lead.status}</td>
                <td>
                  <select value={lead.assignedTo || ""} onChange={(e) => handleAssign(lead.id, e.target.value)}>
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {leads.length === 0 && (
          <div className="p-6 text-center text-gray-500 text-sm">
            Abhi koi lead nahi hai.
          </div>
        )}
      </div>
    </div>
  );
}

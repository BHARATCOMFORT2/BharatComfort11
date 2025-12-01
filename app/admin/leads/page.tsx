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

  /* ✅ ADMIN PROTECTION + SAFE TOKEN LOAD */
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then((t) => {
      setToken(t);
      console.log("✅ Admin token ready");
    });
  }, [firebaseUser, profile, loading, router]);

  /* ✅ Fetch all leads */
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

      // ✅ DATE RANGE FILTER
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

  /* ✅ Fetch all approved telecallers */
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
    } catch (err: any) {
      toast.error(err?.message || "Telecaller list load nahi hui");
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchLeads();
    fetchStaff();
  }, [token]);

  /* ✅ ✅ ✅ FINAL FIXED EXCEL UPLOAD */
  const handleUpload = async () => {
    if (!file) return toast.error("Please select an Excel file");

    if (!token) {
      return toast.error("Token not ready. Page reload karke 2 sec wait karo.");
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/leads/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // ✅ FIXED
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success)
        throw new Error(data?.message || "Upload failed");

      toast.success(`✅ Leads imported: ${data.successCount}/${data.total}`);
      setFile(null);
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || "Excel upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ✅ Single Assign */
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

      if (!res.ok || !data.success)
        throw new Error(data?.message || "Assignment failed");

      toast.success("Lead assigned successfully");
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || "Assignment failed");
    } finally {
      setAssigning(null);
    }
  };

  /* ✅ BULK ASSIGN */
  const handleBulkAssign = async () => {
    if (!bulkStaff || selectedLeads.length === 0)
      return toast.error("Select leads & staff first");

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

      if (!res.ok || !data.success)
        throw new Error(data?.message || "Bulk assign failed");

      toast.success("Multiple leads assigned successfully");
      setSelectedLeads([]);
      setBulkStaff("");
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || "Bulk assign failed");
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Admin Lead / Task Management</h1>

      {/* ✅ DATE FILTER + IMPORT */}
      <div className="flex flex-wrap gap-3 items-end">
        <input type="date" className="border px-2 py-1 rounded text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" className="border px-2 py-1 rounded text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button onClick={fetchLeads} className="px-4 py-2 text-sm bg-black text-white rounded">Filter</button>

        <div className="flex gap-2 items-center ml-auto">
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
          <button
            onClick={handleUpload}
            disabled={uploading || !token}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Import Excel"}
          </button>
        </div>
      </div>

      {/* ✅ BULK BAR */}
      <div className="flex flex-wrap gap-3 items-center bg-gray-50 p-3 rounded border">
        <select className="border px-2 py-1 rounded text-sm" value={bulkStaff} onChange={(e) => setBulkStaff(e.target.value)}>
          <option value="">Select Telecaller</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <button onClick={handleBulkAssign} className="px-4 py-2 text-sm bg-green-600 text-white rounded">
          Assign Selected ({selectedLeads.length})
        </button>
      </div>

      {/* ✅ TABLE */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
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
              <tr key={lead.id}>
                <td><input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelect(lead.id)} /></td>
                <td>{lead.name}</td>
                <td>{lead.businessName}</td>
                <td>{lead.phone}</td>
                <td>{lead.status}</td>
                <td>
                  <select value={lead.assignedTo || ""} onChange={(e) => handleAssign(lead.id, e.target.value)}>
                    <option value="">Unassigned</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {leads.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            Abhi koi lead nahi hai.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

type Lead = {
  id: string;
  name: string;
  businessName: string;
  address: string;
  contact: string;
  email?: string;
  status: string;
  assignedTo?: string | null;
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

  // ✅ NEW STATES
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkStaff, setBulkStaff] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* ✅ ADMIN PROTECTION */
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !["admin", "superadmin"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    firebaseUser.getIdToken().then((t) => setToken(t));
  }, [firebaseUser, profile, loading, router]);

  /* ✅ Fetch all leads with DATE FILTER */
  const fetchLeads = async () => {
    try {
      const query = new URLSearchParams();
      if (fromDate) query.append("from", fromDate);
      if (toDate) query.append("to", toDate);

      const res = await fetch(`/api/admin/leads/all?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Leads fetch failed");
      }

      setLeads(data.data || []);
      setSelectedLeads([]);
    } catch (err: any) {
      toast.error(err?.message || "Leads load nahi ho paaye");
    }
  };

  /* ✅ Fetch all approved telecallers */
  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/admin/staff/telecallers", {
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

  /* ✅ Excel Upload */
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

      if (!res.ok || !data.success)
        throw new Error(data?.message || "Upload failed");

      toast.success(`Leads imported: ${data.successCount}/${data.total}`);
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

      {/* ✅ DATE FILTER */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs">From</label>
          <input
            type="date"
            className="border px-2 py-1 rounded text-sm"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs">To</label>
          <input
            type="date"
            className="border px-2 py-1 rounded text-sm"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          onClick={fetchLeads}
          className="px-4 py-2 text-sm bg-black text-white rounded"
        >
          Filter
        </button>
      </div>

      {/* ✅ BULK ASSIGN BAR */}
      <div className="flex gap-3 items-center bg-gray-50 p-3 rounded border">
        <select
          className="border px-2 py-1 rounded text-sm"
          value={bulkStaff}
          onChange={(e) => setBulkStaff(e.target.value)}
        >
          <option value="">Select Telecaller</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleBulkAssign}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded"
        >
          Assign Selected ({selectedLeads.length})
        </button>
      </div>

      {/* ✅ LEADS TABLE */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2">
                <input
                  type="checkbox"
                  checked={selectedLeads.length === leads.length && leads.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Business</th>
              <th className="px-4 py-2 text-left">Contact</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Assign</th>
              <th className="px-4 py-2">View</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="px-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                  />
                </td>
                <td className="px-4 py-2">{lead.name}</td>
                <td className="px-4 py-2">{lead.businessName}</td>
                <td className="px-4 py-2">{lead.contact}</td>
                <td className="px-4 py-2">{lead.status}</td>
                <td className="px-4 py-2">
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={lead.assignedTo || ""}
                    onChange={(e) =>
                      handleAssign(lead.id, e.target.value)
                    }
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => router.push(`/admin/leads/${lead.id}`)}
                    className="px-3 py-1 text-xs bg-black text-white rounded"
                  >
                    View
                  </button>
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

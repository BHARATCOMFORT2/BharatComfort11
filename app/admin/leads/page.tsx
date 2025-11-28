"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Lead = {
  id: string;
  name: string;
  businessName: string;
  address: string;
  contact: string;
  email?: string;
  status: string;
  assignedTo?: string | null;
};

type Staff = {
  id: string;
  name: string;
};

export default function AdminLeadsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);

  // ✅ Fetch all leads
  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/admin/leads/all");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Leads fetch failed");
      }

      setLeads(data.data || []);
    } catch (err: any) {
      toast.error(err?.message || "Leads load nahi ho paaye");
    }
  };

  // ✅ Fetch all approved telecallers
  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/admin/staff/telecallers");
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
    fetchLeads();
    fetchStaff();
  }, []);

  // ✅ Excel Upload
  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/leads/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Upload failed");
      }

      toast.success(
        `Leads imported: ${data.successCount}/${data.total}`
      );
      setFile(null);
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || "Excel upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Assign Lead to Telecaller
  const handleAssign = async (leadId: string, staffId: string) => {
    if (!staffId) return;

    setAssigning(leadId);
    try {
      const res = await fetch("/api/admin/leads/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId, staffId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Assignment failed");
      }

      toast.success("Lead assigned successfully");
      fetchLeads();
    } catch (err: any) {
      toast.error(err?.message || "Assignment failed");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Admin Lead Management</h1>
        <p className="text-sm text-gray-500">
          Excel upload karein, leads dekhein aur telecaller ko assign karein.
        </p>
      </div>

      {/* Excel Upload */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-medium">Import Leads (Excel)</h2>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-4 py-2 text-sm rounded-md bg-black text-white disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload Excel"}
        </button>
        <p className="text-xs text-gray-500">
          Required columns: name | businessName | address | contact | email
        </p>
      </div>

      {/* Leads Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-medium">
          All Leads
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Business</th>
                <th className="px-4 py-2 text-left">Contact</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Assign Telecaller</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead) => (
                <tr key={lead.id}>
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
                      disabled={assigning === lead.id}
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
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
    </div>
  );
}

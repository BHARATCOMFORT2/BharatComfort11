"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Lead = {
  id: string;
  name: string;
  businessName: string;
  address: string;
  contact: string;
  email?: string;
  status: string;
  partnerNotes?: string;
  assignedTo?: string | null;

  // ✅ NEW TASK-LIKE FIELDS
  adminNote?: string;
  dueDate?: any;
};

type Staff = {
  id: string;
  name: string;
};

export default function AdminLeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // ✅ NEW STATES
  const [adminNote, setAdminNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [savingTaskFields, setSavingTaskFields] = useState(false);

  // ✅ Fetch Lead Details
  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Lead load failed");
      }

      const leadData = data.data;
      setLead(leadData);

      // ✅ preload task fields
      setAdminNote(leadData.adminNote || "");

      if (leadData?.dueDate?.seconds) {
        const dt = new Date(leadData.dueDate.seconds * 1000);
        setDueDate(dt.toISOString().split("T")[0]);
      } else {
        setDueDate("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lead load nahi ho paayi");
      router.push("/admin/leads");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Telecallers
  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/admin/staff/telecallers");
      const data = await res.json();

      if (res.ok && data.success) {
        setStaffList(data.data || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (leadId) {
      fetchLead();
      fetchStaff();
    }
  }, [leadId]);

  // ✅ Re-Assign Lead
  const handleAssign = async (staffId: string) => {
    if (!lead) return;

    setAssigning(true);
    try {
      const res = await fetch("/api/admin/leads/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
          staffId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Assignment failed");
      }

      toast.success("Lead successfully re-assigned");
      fetchLead();
    } catch (err: any) {
      toast.error(err?.message || "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  // ✅ SAVE TASK FIELDS (adminNote + dueDate)
  const handleSaveTaskFields = async () => {
    if (!lead) return;

    setSavingTaskFields(true);
    try {
      const res = await fetch(`/api/admin/leads/update-task-fields`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
          adminNote,
          dueDate: dueDate || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Task update failed");
      }

      toast.success("Task fields updated");
      fetchLead();
    } catch (err: any) {
      toast.error(err?.message || "Task update failed");
    } finally {
      setSavingTaskFields(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading lead details...</div>
    );
  }

  if (!lead) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lead Details (Task View)</h1>
          <p className="text-sm text-gray-500">
            Lead + Telecaller Task Control Panel
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/leads")}
          className="text-sm underline"
        >
          ← Back to Leads
        </button>
      </div>

      {/* Lead Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border rounded-xl p-5">
        <div>
          <p className="text-xs text-gray-500">Name</p>
          <p className="text-sm font-medium">{lead.name}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Business Name</p>
          <p className="text-sm font-medium">{lead.businessName}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Contact</p>
          <p className="text-sm font-medium">{lead.contact}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm font-medium">{lead.email || "-"}</p>
        </div>

        <div className="md:col-span-2">
          <p className="text-xs text-gray-500">Address</p>
          <p className="text-sm">{lead.address || "-"}</p>
        </div>
      </div>

      {/* ✅ TASK CONTROLS (NEW) */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Task Controls (For Telecaller)</h3>

        <div>
          <p className="text-xs text-gray-500 mb-1">Admin Instruction</p>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            placeholder="Eg: Aaj hi follow-up karna, urgent client"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Due Date</p>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={handleSaveTaskFields}
          disabled={savingTaskFields}
          className="inline-flex items-center px-4 py-2 text-sm rounded bg-black text-white disabled:opacity-50"
        >
          {savingTaskFields ? "Saving..." : "Save Task Settings"}
        </button>
      </div>

      {/* Status + Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status */}
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-sm font-medium mb-2">Current Status</h3>
          <p className="text-sm capitalize">{lead.status}</p>
        </div>

        {/* Assignment */}
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-sm font-medium mb-2">Assigned Telecaller</h3>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={lead.assignedTo || ""}
            onChange={(e) => handleAssign(e.target.value)}
            disabled={assigning}
          >
            <option value="">Unassigned</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Telecaller Notes */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="text-sm font-medium mb-2">Telecaller Notes</h3>

        {lead.partnerNotes ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {lead.partnerNotes}
          </p>
        ) : (
          <p className="text-sm text-gray-400">No notes added yet.</p>
        )}
      </div>
    </div>
  );
}

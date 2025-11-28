"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
  createdAt?: any;
};

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "converted",
  "invalid",
];

export default function TelecallerDashboardPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

  // ✅ Auth check – only logged-in staff allowed
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStaffId(null);
        setLoadingUser(false);
        router.push("/login"); // adjust path if different
        return;
      }

      setStaffId(user.uid);
      setLoadingUser(false);
    });

    return () => unsub();
  }, [router]);

  // ✅ Fetch assigned leads for this telecaller
  useEffect(() => {
    const fetchLeads = async () => {
      if (!staffId) return;
      setLoadingLeads(true);
      try {
        const res = await fetch("/api/staff/leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ staffId }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to fetch leads");
        }

        setLeads(data.data || []);
      } catch (err: any) {
        console.error("Failed to load leads:", err);
        toast.error(err?.message || "Leads load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [staffId]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    if (!staffId) return;

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId,
          leadId,
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Status update failed");
      }

      // local state update
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );

      toast.success("Lead status updated");
    } catch (err: any) {
      console.error("Status update error:", err);
      toast.error(err?.message || "Status update nahi ho paaya");
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleNotesSave = async (leadId: string, notes: string) => {
    if (!staffId) return;

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId,
          leadId,
          partnerNotes: notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Notes update failed");
      }

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, partnerNotes: notes } : lead
        )
      );

      toast.success("Notes saved");
    } catch (err: any) {
      console.error("Notes update error:", err);
      toast.error(err?.message || "Notes save nahi ho paaye");
    } finally {
      setSavingLeadId(null);
    }
  };

  if (loadingUser) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-500">Checking staff session...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!staffId) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Telecaller Dashboard</h1>
            <p className="text-sm text-gray-500">
              Assigned leads par call karein, status update karein, aur partner
              details notes me add karein.
            </p>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium">My Leads</h2>
            {loadingLeads && (
              <span className="text-xs text-gray-400">Loading...</span>
            )}
          </div>

          {leads.length === 0 && !loadingLeads ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Aapko abhi tak koi lead assign nahi hui hai.
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
                      Address
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">
                      Partner Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {lead.name || "-"}
                        </div>
                        {lead.email && (
                          <div className="text-xs text-gray-500">
                            {lead.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800">
                          {lead.businessName || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{lead.contact}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-gray-700 text-xs">
                          {lead.address || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="border rounded-md px-2 py-1 text-xs bg-white"
                          value={lead.status || "new"}
                          onChange={(e) =>
                            handleStatusChange(lead.id, e.target.value)
                          }
                          disabled={savingLeadId === lead.id}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <textarea
                            className="w-full border rounded-md px-2 py-1 text-xs min-w-[200px] min-h-[60px]"
                            defaultValue={lead.partnerNotes || ""}
                            onBlur={(e) =>
                              e.target.value !== (lead.partnerNotes || "") &&
                              handleNotesSave(lead.id, e.target.value)
                            }
                            placeholder="Call details, hotel info, owner response..."
                            disabled={savingLeadId === lead.id}
                          />
                          <p className="text-[10px] text-gray-400">
                            Notes change karne ke baad field se bahar aate hi
                            auto-save ho jayega (on blur).
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

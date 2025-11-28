"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
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
  const [token, setToken] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  // ✅ FULL STAFF AUTH + APPROVAL CHECK (staff collection + role telecaller)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStaffId(null);
        setLoadingUser(false);
        router.push("/staff/login");
        return;
      }

      try {
        // staff collection
        const snap = await getDoc(doc(db, "staff", user.uid));

        if (!snap.exists()) {
          await signOut(auth);
          toast.error("Staff profile not found");
          router.push("/staff/login");
          return;
        }

        const profile = snap.data();

        if (profile.role !== "telecaller") {
          await signOut(auth);
          toast.error("This dashboard is for telecallers only");
          router.push("/staff/login");
          return;
        }

        if (profile.status === "pending") {
          await signOut(auth);
          toast("Your account is pending admin approval", { icon: "⏳" });
          router.push("/staff/login");
          return;
        }

        if (profile.status === "rejected") {
          await signOut(auth);
          toast.error("Your account has been rejected by admin");
          router.push("/staff/login");
          return;
        }

        if (profile.isActive !== true) {
          await signOut(auth);
          toast.error("Your account is inactive");
          router.push("/staff/login");
          return;
        }

        // ✅ Approved + active telecaller
        setStaffId(user.uid);
        const t = await user.getIdToken();
        setToken(t);
      } catch (err) {
        console.error("Staff auth check error:", err);
        await signOut(auth);
        router.push("/staff/login");
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsub();
  }, [router]);

  // ✅ Fetch assigned leads = telecaller ke tasks
  useEffect(() => {
    const fetchLeads = async () => {
      if (!staffId) return;
      setLoadingLeads(true);

      try {
        const res = await fetch("/api/staff/leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // token yahan optional hai (API abhi body se staffId leta hai),
            // future me secure version ke liye ready hai
          },
          body: JSON.stringify({ staffId }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to fetch leads");
        }

        const list: Lead[] = data.data || [];
        setLeads(list);

        // notes draft preload
        const draft: Record<string, string> = {};
        list.forEach((lead) => {
          draft[lead.id] = lead.partnerNotes || "";
        });
        setNotesDraft(draft);
      } catch (err: any) {
        console.error("Failed to load leads:", err);
        toast.error(err?.message || "Leads load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [staffId]);

  // ✅ Status change (including "Done" via converted)
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    if (!token) {
      toast.error("Auth token missing. Please re-login.");
      return;
    }

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.message || "Status update failed");
      }

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

  // ✅ Notes save
  const handleNotesSave = async (leadId: string) => {
    if (!token) {
      toast.error("Auth token missing. Please re-login.");
      return;
    }

    const notes = notesDraft[leadId] ?? "";

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, partnerNotes: notes }),
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
          <p className="text-sm text-gray-500">Checking staff access...</p>
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
        <div>
          <h1 className="text-xl font-semibold">Telecaller Dashboard</h1>
          <p className="text-sm text-gray-500">
            Ye saare leads hi tumhare <strong>tasks</strong> hain. In par call
            karo, status update karo aur notes add karo. <br />
            <span className="font-medium">
              "converted" = Done / Successfully closed.
            </span>
          </p>
        </div>

        {/* LEADS = TASKS TABLE */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loadingLeads ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Loading your leads / tasks...
            </div>
          ) : leads.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Abhi tak koi lead / task assign nahi hua hai.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Lead / Business</th>
                  <th className="p-3 text-left">Contact</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Notes</th>
                  <th className="p-3 text-center">Mark as Done</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const isDone = lead.status === "converted";
                  return (
                    <tr key={lead.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-gray-500">
                          {lead.businessName}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{lead.contact}</div>
                        {lead.address && (
                          <div className="text-xs text-gray-400">
                            {lead.address}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-xs">{lead.email || "-"}</td>

                      {/* Status dropdown */}
                      <td className="p-3">
                        <select
                          className="border rounded px-2 py-1 text-xs"
                          value={lead.status}
                          disabled={savingLeadId === lead.id}
                          onChange={(e) =>
                            handleStatusChange(lead.id, e.target.value)
                          }
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st === "converted"
                                ? "converted (Done)"
                                : st.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Notes */}
                      <td className="p-3">
                        <textarea
                          className="border rounded w-full text-xs p-2"
                          rows={2}
                          placeholder="Call summary / follow-up note"
                          value={notesDraft[lead.id] ?? ""}
                          onChange={(e) =>
                            setNotesDraft((prev) => ({
                              ...prev,
                              [lead.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          onClick={() => handleNotesSave(lead.id)}
                          disabled={savingLeadId === lead.id}
                          className="mt-1 inline-flex items-center px-2 py-1 text-xs rounded bg-gray-900 text-white disabled:opacity-50"
                        >
                          {savingLeadId === lead.id ? "Saving..." : "Save Notes"}
                        </button>
                      </td>

                      {/* Mark as Done (Converted) */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            !isDone && handleStatusChange(lead.id, "converted")
                          }
                          disabled={savingLeadId === lead.id || isDone}
                          className={`inline-flex items-center px-3 py-1 text-xs rounded ${
                            isDone
                              ? "bg-green-100 text-green-700 cursor-default"
                              : "bg-green-600 text-white hover:bg-green-700"
                          } disabled:opacity-60`}
                        >
                          {isDone ? "Done" : "Mark Converted (Done)"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

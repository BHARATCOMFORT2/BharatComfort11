"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

/* ---------------------------------------
   TYPES
---------------------------------------- */
type Lead = {
  id: string;
  name: string;
  businessName: string;
  address?: string;
  contact: string;
  email?: string;
  status: string;
  partnerNotes?: string;

  // ✅ TASK FIELDS FROM ADMIN
  adminNote?: string;
  dueDate?: any;
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

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export default function TelecallerDashboardPage() {
  const router = useRouter();

  const [staffId, setStaffId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const [staffProfile, setStaffProfile] = useState<{
    name?: string;
    role?: "staff";
  } | null>(null);

  /* ---------------------------------------
     ✅ STAFF AUTH + APPROVAL CHECK
  ---------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStaffId(null);
        setLoadingUser(false);
        router.push("/staff/login");
        return;
      }

      try {
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

        if (profile.status !== "approved" || profile.isActive !== true) {
          await signOut(auth);
          toast("Your account is not active", { icon: "⏳" });
          router.push("/staff/login");
          return;
        }

        setStaffId(user.uid);

        const t = await user.getIdToken();
        setToken(t);

        setStaffProfile({
          name:
            profile.name ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "Telecaller",
          role: "staff",
        });
      } catch (err) {
        console.error("Staff auth error:", err);
        await signOut(auth);
        router.push("/staff/login");
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsub();
  }, [router]);

  /* ---------------------------------------
     ✅ FETCH ASSIGNED LEADS = TASKS
  ---------------------------------------- */
  useEffect(() => {
    const fetchLeads = async () => {
      if (!staffId) return;
      setLoadingLeads(true);

      try {
        const res = await fetch("/api/staff/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to fetch leads");
        }

        const list: Lead[] = data.data || [];
        setLeads(list);

        const draft: Record<string, string> = {};
        list.forEach((lead) => {
          draft[lead.id] = lead.partnerNotes || "";
        });
        setNotesDraft(draft);
      } catch (err: any) {
        toast.error(err?.message || "Leads load nahi ho paaye");
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [staffId]);

  /* ---------------------------------------
     ✅ ✅ ✅ UNIFIED UPDATE (STATUS + NOTES + PERFORMANCE SYNC)
     This replaces:
     - /update-status
     - /update-notes
  ---------------------------------------- */
  const updateLead = async (
    leadId: string,
    payload: { status?: string; notes?: string }
  ) => {
    if (!token) return toast.error("Please re-login");

    setSavingLeadId(leadId);
    try {
      const res = await fetch("/api/staff/leads/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadId,
          status: payload.status,
          note: payload.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data?.message || "Lead update failed");

      // ✅ LOCAL STATE SAFE UPDATE (NO DATA LOSS)
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                status: payload.status ?? lead.status,
                partnerNotes:
                  payload.notes !== undefined
                    ? payload.notes
                    : lead.partnerNotes,
              }
            : lead
        )
      );

      toast.success("Lead updated");
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSavingLeadId(null);
    }
  };

  /* ---------------------------------------
     ✅ LOADING + BLOCKS
  ---------------------------------------- */
  if (loadingUser) {
    return (
      <DashboardLayout
        title="Telecaller Task Dashboard"
        profile={staffProfile || undefined}
      >
        <div className="flex items-center justify-center h-64 text-sm text-gray-500">
          Checking staff access...
        </div>
      </DashboardLayout>
    );
  }

  if (!staffId) return null;

  const isOverdue = (dueDate: any, status: string) => {
    if (!dueDate?.seconds) return false;
    if (status === "converted") return false;
    const due = new Date(dueDate.seconds * 1000);
    return Date.now() > due.getTime();
  };

  /* ---------------------------------------
     ✅ FINAL RENDER (UI SAME AS BEFORE)
  ---------------------------------------- */
  return (
    <DashboardLayout
      title="Telecaller Task Dashboard"
      profile={staffProfile || undefined}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Telecaller Task Dashboard</h1>
          <p className="text-sm text-gray-500">
            Ye saare leads hi tumhare <b>tasks</b> hain. <br />
            <b>Converted = DONE</b>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loadingLeads ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Loading your tasks...
            </div>
          ) : leads.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Abhi koi task assign nahi hua.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Lead</th>
                  <th className="p-3 text-left">Contact</th>
                  <th className="p-3 text-left">Admin Note</th>
                  <th className="p-3 text-left">Due Date</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Notes</th>
                  <th className="p-3 text-center">Done</th>
                </tr>
              </thead>

              <tbody>
                {leads.map((lead) => {
                  const done = lead.status === "converted";
                  const overdue = isOverdue(lead.dueDate, lead.status);

                  return (
                    <tr
                      key={lead.id}
                      className={`border-t ${overdue ? "bg-red-50" : ""}`}
                    >
                      <td className="p-3">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-gray-500">
                          {lead.businessName}
                        </div>
                      </td>

                      <td className="p-3">{lead.contact}</td>

                      <td className="p-3 text-xs">
                        {lead.adminNote || "-"}
                      </td>

                      <td className="p-3 text-xs">
                        {lead.dueDate?.seconds
                          ? new Date(
                              lead.dueDate.seconds * 1000
                            ).toLocaleDateString()
                          : "-"}
                        {overdue && (
                          <div className="text-red-600 font-semibold">
                            Overdue
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <select
                          className="border rounded px-2 py-1 text-xs"
                          value={lead.status}
                          disabled={savingLeadId === lead.id}
                          onChange={(e) =>
                            updateLead(lead.id, { status: e.target.value })
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

                      <td className="p-3">
                        <textarea
                          className="border rounded w-full text-xs p-2"
                          rows={2}
                          value={notesDraft[lead.id] ?? ""}
                          onChange={(e) =>
                            setNotesDraft((prev) => ({
                              ...prev,
                              [lead.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          onClick={() =>
                            updateLead(lead.id, {
                              notes: notesDraft[lead.id],
                            })
                          }
                          disabled={savingLeadId === lead.id}
                          className="mt-1 px-2 py-1 text-xs bg-black text-white rounded"
                        >
                          Save
                        </button>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            !done &&
                            updateLead(lead.id, { status: "converted" })
                          }
                          disabled={done}
                          className={`px-3 py-1 text-xs rounded ${
                            done
                              ? "bg-green-100 text-green-700"
                              : "bg-green-600 text-white"
                          }`}
                        >
                          {done ? "Done" : "Mark Done"}
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
